<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Http\Request;

class DeliveryController extends Controller
{
    // ── ALL DELIVERIES (admin) ─────────────────────────────
    public function index()
    {
        return response()->json(
            Delivery::with(['reservation.equipment', 'reservation.farmer', 'driver'])
                ->latest()->get()
        );
    }

    // ── DRIVER'S OWN DELIVERIES ────────────────────────────
    public function driverDeliveries($driverId)
    {
        return response()->json(
            Delivery::with(['reservation.equipment', 'reservation.farmer', 'driver'])
                ->where('driver_id', $driverId)
                ->latest()
                ->get()
        );
    }

    // ── CREATE DELIVERY (admin assigns) ───────────────────
    public function store(Request $request)
    {
        $data = $request->validate([
            'reservation_id' => 'required|exists:reservations,reservation_id', 
            'driver_id'      => 'required|exists:users,id',
            'distance_km'    => 'required|numeric',
            'price_per_km'   => 'required|numeric',
            'delivery_date'  => 'nullable|date',
        ]);

        $res = Reservation::where('reservation_id', $data['reservation_id'])->firstOrFail();
        
        $deliveryFee = $data['distance_km'] * $data['price_per_km'];

        $delivery = Delivery::updateOrCreate(
            ['reservation_id' => $data['reservation_id']],
            [
                'driver_id'        => $data['driver_id'],
                'distance_km'      => $data['distance_km'],
                'price_per_km'     => $data['price_per_km'],
                'delivery_fee'     => $deliveryFee,
                'delivery_date'    => $data['delivery_date'],
                'delivery_status'  => 'pending',
                'delivery_address' => $res->delivery_address, 
                'latitude'         => $res->latitude,        
                'longitude'        => $res->longitude,        
            ]
        );

        if (in_array($res->status, ['approved', 'pending'])) {
            $res->update(['status' => 'assigned']);
        }

        return response()->json(
            Delivery::with(['reservation.equipment', 'reservation.farmer', 'driver'])
            ->find($delivery->delivery_id)
        );
    }

    // ── UPDATE STATUS (Fixed the $res Error) ────────────────
    public function update(Request $request, $id)
    {
        // 1. Find delivery and load reservation relationship
        $delivery = Delivery::with('reservation')->findOrFail($id);
        $res = $delivery->reservation; // 🟢 FIX: This defines $res so line 85+ works

        $newDeliveryStatus = $request->input('delivery_status', $delivery->delivery_status);

        // Calculate fee safely
        $dist = $request->input('distance_km', $delivery->distance_km);
        $price = $request->input('price_per_km', $delivery->price_per_km);
        $newFee = $dist * $price;

        $delivery->update([
            'driver_id'       => $request->input('driver_id', $delivery->driver_id),
            'distance_km'     => $dist,
            'price_per_km'    => $price,
            'delivery_fee'    => $newFee,
            'delivery_status' => $newDeliveryStatus,
            'delivery_date'   => $request->input('delivery_date', $delivery->delivery_date),
            // 🟢 These now work because $res is defined above
            'delivery_address' => $res ? $res->delivery_address : $delivery->delivery_address,
            'latitude'         => $res ? $res->latitude : $delivery->latitude,
            'longitude'        => $res ? $res->longitude : $delivery->longitude,
        ]);

        // Logic for Reservation Status
        if ($newDeliveryStatus === 'delivered') {
            if ($res) {
                $res->update(['status' => 'completed']);
                if ($res->equipment) {
                    $res->equipment->update(['status' => 'available']);
                }
            }
        } elseif ($newDeliveryStatus === 'shipping' || $newDeliveryStatus === 'in_transit') {
            // 🟢 Handle both 'shipping' (from Android) or 'in_transit'
            if ($res) {
                $res->update(['status' => 'assigned']);
            }
        }

        return response()->json(
            Delivery::with(['reservation.equipment', 'reservation.farmer', 'driver'])
            ->find($delivery->delivery_id)
        );
    }

    public function updateDriverLocation(Request $request)
    {
        $request->validate([
            'lat' => 'required|numeric',
            'lng' => 'required|numeric',
        ]);

        $user = $request->user();

        $user->update([
            'current_lat' => $request->lat,
            'current_lng' => $request->lng,
            'location_updated_at' => now(),
        ]);

        return response()->json(['message' => 'Location updated successfully']);
    }

    public function destroy($id)
    {
        Delivery::findOrFail($id)->delete();
        return response()->json(['message' => 'Deleted']);
    }
}