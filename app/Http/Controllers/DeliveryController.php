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

        // Pull address from the reservation
        $res = Reservation::findOrFail($data['reservation_id']);
        $data['delivery_fee']     = $data['distance_km'] * $data['price_per_km'];
        $data['delivery_status']  = 'pending';
        $data['delivery_address'] = $res->delivery_address;
        $data['latitude']         = $res->latitude;
        $data['longitude']        = $res->longitude;

        $delivery = Delivery::updateOrCreate(
            ['reservation_id' => $data['reservation_id']],
            $data
        );
        if (in_array($res->status, ['approved', 'pending'])) {
            $res->update(['status' => 'assigned']);
        }

        return response()->json(
            Delivery::with(['reservation.equipment', 'reservation.farmer', 'driver'])
            ->find($delivery->delivery_id)
            );
        }

    // ── UPDATE STATUS ──────────────────────────────────────
    public function update(Request $request, $id)
    {
        $delivery = Delivery::findOrFail($id);

        $newDeliveryStatus = $request->input('delivery_status', $delivery->delivery_status);

        $delivery->fill([
            'driver_id'        => $request->input('driver_id', $delivery->driver_id),
            'distance_km'      => $request->input('distance_km', $delivery->distance_km),
            'price_per_km'     => $request->input('price_per_km', $delivery->price_per_km),
            'delivery_fee'     => $request->input('delivery_fee',
                                  $request->input('distance_km', $delivery->distance_km) *
                                  $request->input('price_per_km', $delivery->price_per_km)),
            'delivery_status'  => $newDeliveryStatus,
            'delivery_date'    => $request->input('delivery_date', $delivery->delivery_date),
            'delivery_address' => $request->input('delivery_address', $delivery->delivery_address),
            'latitude'         => $request->input('latitude', $delivery->latitude),
            'longitude'        => $request->input('longitude', $delivery->longitude),
        ]);

        $delivery->save();
        $delivery->load('reservation.equipment');

        // Handle reservation status based on delivery status
        if ($newDeliveryStatus === 'delivered') {
            // Delivery done → complete the reservation and free equipment
            if ($delivery->reservation) {
                $delivery->reservation->update(['status' => 'completed']);
                if ($delivery->reservation->equipment) {
                    $delivery->reservation->equipment->update(['status' => 'available']);
                }
            }
        } elseif ($newDeliveryStatus === 'in_transit') {
            // Driver started delivery
            if ($delivery->reservation &&
                in_array($delivery->reservation->status, ['assigned', 'approved'])) {
                $delivery->reservation->update(['status' => 'assigned']);
            }
        } elseif ($request->has('driver_id') && $request->driver_id
                && $newDeliveryStatus === 'pending') {
            // Driver just assigned for first time
            if ($delivery->reservation &&
                in_array($delivery->reservation->status, ['approved', 'pending'])) {
                $delivery->reservation->update(['status' => 'assigned']);
            }
        }

        return response()->json(
            Delivery::with(['reservation.equipment', 'reservation.farmer', 'driver'])
                ->find($id)
        );
    }

    // ── DELETE ─────────────────────────────────────────────
    public function destroy($id)
    {
        Delivery::findOrFail($id)->delete();
        return response()->json(['message' => 'Deleted']);
    }
}