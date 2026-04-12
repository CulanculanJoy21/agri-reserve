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
            // Changed reservation_id to check against 'id' if that's your primary key
            'reservation_id' => 'required|exists:reservations,reservation_id', 
            'driver_id'      => 'required|exists:users,id',
            'distance_km'    => 'required|numeric',
            'price_per_km'   => 'required|numeric',
            'delivery_date'  => 'nullable|date',
        ]);

        $res = Reservation::where('reservation_id', $data['reservation_id'])->firstOrFail();
        
        // Calculate fee
        $deliveryFee = $data['distance_km'] * $data['price_per_km'];

        // Create delivery WITHOUT address/lat/lng columns
        $delivery = Delivery::updateOrCreate(
            ['reservation_id' => $data['reservation_id']],
            [
                'driver_id'       => $data['driver_id'],
                'distance_km'     => $data['distance_km'],
                'price_per_km'    => $data['price_per_km'],
                'delivery_fee'    => $deliveryFee,
                'delivery_date'   => $data['delivery_date'],
                'delivery_status' => 'pending',
            ]
        );

        if (in_array($res->status, ['approved', 'pending'])) {
            $res->update(['status' => 'assigned']);
        }

        return response()->json(
            Delivery::with(['reservation.equipment', 'reservation.farmer', 'driver'])
            ->find($delivery->id) // Use 'id' or your primary key
        );
    }

    // ── UPDATE STATUS ──────────────────────────────────────
    public function update(Request $request, $id)
    {
        $delivery = Delivery::findOrFail($id);
        $newDeliveryStatus = $request->input('delivery_status', $delivery->delivery_status);

        $delivery->fill([
            'driver_id'       => $request->input('driver_id', $delivery->driver_id),
            'distance_km'     => $request->input('distance_km', $delivery->distance_km),
            'price_per_km'    => $request->input('price_per_km', $delivery->price_per_km),
            'delivery_fee'    => $request->input('distance_km', $delivery->distance_km) * $request->input('price_per_km', $delivery->price_per_km),
            'delivery_status' => $newDeliveryStatus,
            'delivery_date'   => $request->input('delivery_date', $delivery->delivery_date),
            // ❌ Removed address, latitude, and longitude from here
        ]);

        $delivery->save();
        $delivery->load('reservation.equipment');

        // Reservation logic stays the same
        if ($newDeliveryStatus === 'delivered') {
            if ($delivery->reservation) {
                $delivery->reservation->update(['status' => 'completed']);
                if ($delivery->reservation->equipment) {
                    $delivery->reservation->equipment->update(['status' => 'available']);
                }
            }
        } elseif ($newDeliveryStatus === 'in_transit') {
            if ($delivery->reservation) {
                $delivery->reservation->update(['status' => 'assigned']);
            }
        }

        return response()->json(
            Delivery::with(['reservation.equipment', 'reservation.farmer', 'driver'])
            ->find($delivery->delivery_id) // Match your migration's column name
        );
    }

    // ── DELETE ─────────────────────────────────────────────
    public function destroy($id)
    {
        Delivery::findOrFail($id)->delete();
        return response()->json(['message' => 'Deleted']);
    }
}