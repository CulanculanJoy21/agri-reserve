<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Http\Request;

class DeliveryController extends Controller
{
    // ── ALL DELIVERIES (admin dashboard) ─────────────────────────────
    public function index()
    {
        return response()->json(
            Delivery::with(['reservation.equipment', 'reservation.farmer', 'driver'])
                ->latest()->get()
        );
    }

    // ── DRIVER'S OWN DELIVERIES (for Android List) ────────────────────────────
    public function driverDeliveries($driverId)
    {
        return response()->json(
            Delivery::with(['reservation.equipment', 'reservation.farmer', 'driver'])
                ->where('driver_id', $driverId)
                ->latest()
                ->get()
        );
    }

    // ── CREATE DELIVERY (When admin assigns a driver) ───────────────────
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

    // ── UPDATE STATUS (Syncs with Android "Start/Complete" buttons) ────────────────
    public function update(Request $request, $id)
    {
        // Load with reservation and equipment to ensure we can sync statuses
        $delivery = Delivery::with('reservation.equipment')->findOrFail($id);
        $res = $delivery->reservation; 

        $newDeliveryStatus = $request->input('delivery_status', $delivery->delivery_status);

        // 1. 🟢 LIVE TRACKING SYNC: If moving, update the User's heartbeat
        // This ensures the green dot appears on the Admin Map instantly.
        if ($newDeliveryStatus === 'shipping' || $newDeliveryStatus === 'in_transit') {
            $request->user()->update([
                'location_updated_at' => now(),
                'current_lat' => $request->input('latitude', $request->user()->current_lat),
                'current_lng' => $request->input('longitude', $request->user()->current_lng),
            ]);
        }

        // 2. Safe calculation of delivery fee
        $dist = $request->input('distance_km', $delivery->distance_km);
        $price = $request->input('price_per_km', $delivery->price_per_km);
        $newFee = $dist * $price;

        // 3. Update the Delivery Record
        $delivery->update([
            'driver_id'        => $request->input('driver_id', $delivery->driver_id),
            'distance_km'      => $dist,
            'price_per_km'     => $price,
            'delivery_fee'     => $newFee,
            'delivery_status'  => $newDeliveryStatus,
            'delivery_date'    => $request->input('delivery_date', $delivery->delivery_date),
            'delivery_address' => $res ? $res->delivery_address : $delivery->delivery_address,
            'latitude'         => $request->input('latitude', $delivery->latitude),
            'longitude'        => $request->input('longitude', $delivery->longitude),
        ]);

        // 4. 🟢 RESERVATION LIFECYCLE SYNC
        if ($newDeliveryStatus === 'delivered') {
            // Keep as 'assigned' (Dashboard shows "With Farmer")
            if ($res) {
                $res->update(['status' => 'assigned']);
            }
        } 
        elseif ($newDeliveryStatus === 'shipping' || $newDeliveryStatus === 'in_transit') {
            // 🟢 CHANGE: Push 'in_transit' to the reservation
            // This allows the Farmer app to show the "In Transit" badge
            if ($res) {
                $res->update(['status' => 'in_transit']);
            }
        }

        return response()->json(
            Delivery::with(['reservation.equipment', 'reservation.farmer', 'driver'])
            ->find($delivery->delivery_id)
        );
    }
    // ── LIVE LOCATION UPDATE (Called by Android GPS Service) ───────────────────────
    public function updateDriverLocation(Request $request)
    {
        // 1. Support BOTH short (lat) and long (latitude) labels
        $lat = $request->input('latitude') ?? $request->input('lat');
        $lng = $request->input('longitude') ?? $request->input('lng');

        // 2. Only update if we actually have numbers
        if (is_numeric($lat) && is_numeric($lng)) {
            $request->user()->update([
                'current_lat' => $lat,
                'current_lng' => $lng,
                'location_updated_at' => now(),
            ]);

            return response()->json([
                'message' => 'Location updated!',
                'lat' => $lat,
                'lng' => $lng
            ]);
        }

        // 3. Fallback: Tell us what the server actually received
        return response()->json([
            'error' => 'Invalid or missing coordinates',
            'received' => $request->all()
        ], 400);
    }
}