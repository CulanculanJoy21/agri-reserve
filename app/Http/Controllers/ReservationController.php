<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\Equipment;
use App\Models\Reservation;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ReservationController extends Controller
{
    // --- GET ALL RESERVATIONS ---
    public function index(Request $request)
    {
        $user  = $request->user();
        $query = Reservation::with(['farmer', 'equipment', 'delivery.driver', 'feedback']);

        if ($user->role === 'farmer') {
            $query->where('user_id', $user->id);
        }

        if ($user->role === 'driver') {
            return response()->json([]);
        }

        return response()->json($query->latest()->get());
    }

    // 🟢 ADDED: SHOW METHOD (Fixes the "Eye" button 500 error)
    public function show($id)
    {
        $res = Reservation::with(['farmer', 'equipment', 'delivery.driver', 'feedback'])
            ->findOrFail($id);
        return response()->json($res);
    }

    // --- CREATE RESERVATION ---
    public function store(Request $request)
    {
        $data = $request->validate([
            'equipment_id'      => 'required|exists:equipment,equipment_id',
            'reserved_quantity' => 'required|integer|min:1', 
            'start_date'        => 'required|date',
            'end_date'          => 'required|date|after_or_equal:start_date',
            'reservation_type'  => 'required|in:pickup,delivery',
            'notes'             => 'nullable|string',
            'delivery_address'  => 'nullable|string',
            'latitude'          => 'nullable|numeric',
            'longitude'         => 'nullable|numeric',
        ]);

        $data['user_id'] = $request->user()->id;
        $data['status']  = 'pending';

        $equip = Equipment::where('equipment_id', $data['equipment_id'])->firstOrFail();
        $qty   = $data['reserved_quantity'];

        if ($equip->available_quantity < $qty) {
            return response()->json(['message' => "Only {$equip->available_quantity} units available"], 422);
        }

        $start = Carbon::parse($data['start_date']);
        $end   = Carbon::parse($data['end_date']);
        $days  = $end->diffInDays($start) + 1;

        $data['total_days']        = $days;
        $data['total_rental_cost'] = $days * ($equip->rental_price * $qty);

        $equip->decrement('available_quantity', $qty);
        if ($equip->available_quantity <= 0) {
            $equip->update(['status' => 'reserved']);
        }

        $res = Reservation::create($data);

        return response()->json(
            Reservation::with(['farmer', 'equipment'])->find($res->reservation_id),
            201
        );
    }

    // --- APPROVE RESERVATION ---
    public function approve($id)
    {
        $res = Reservation::with('equipment')->findOrFail($id);
        $res->update(['status' => 'approved']);

        if ($res->reservation_type === 'delivery') {
            $pricePerKm = Setting::where('key', 'price_per_km')->value('value') ?? 25;
            Delivery::firstOrCreate(
                ['reservation_id' => $res->reservation_id],
                [
                    'price_per_km'     => $pricePerKm,
                    'delivery_status'  => 'pending',
                    'delivery_address' => $res->delivery_address,
                    'latitude'         => $res->latitude,
                    'longitude'        => $res->longitude,
                    'delivery_fee'     => 0,
                    'distance_km'      => 0,
                ]
            );
        }
        return response()->json($res);
    }

    // 🟢 ADDED: CANCEL METHOD (Fixes the Cancel button 500 error)
    public function cancel($id)
    {
        $res = Reservation::with('equipment')->findOrFail($id);
        
        // Safety check
        if (!in_array($res->status, ['pending', 'approved', 'assigned'])) {
            return response()->json(['message' => 'Cannot cancel this reservation'], 422);
        }

        // 🟢 CHANGE: Use 'cancelled' instead of 'rejected'
        $res->update(['status' => 'cancelled']);

        if ($res->equipment) {
            $res->equipment->increment('available_quantity', $res->reserved_quantity);
            if ($res->equipment->status === 'reserved') {
                $res->equipment->update(['status' => 'available']);
            }
        }

        return response()->json($res);
    }

    // --- REJECT RESERVATION ---
    public function reject($id)
    {
        $res = Reservation::with('equipment')->findOrFail($id);
        $res->update(['status' => 'rejected']);

        if ($res->equipment) {
            $res->equipment->increment('available_quantity', $res->reserved_quantity); 
            if ($res->equipment->status === 'reserved') {
                $res->equipment->update(['status' => 'available']);
            }
        }
        return response()->json($res);
    }

    // --- RETURN EQUIPMENT ---
    public function returnEquipment($id)
    {
        $res   = Reservation::with('equipment')->findOrFail($id);
        $equip = $res->equipment;

        $res->update([
            'status'      => 'completed',
            'returned_at' => now(),
        ]);

        if ($equip) {
            $equip->increment('available_quantity', $res->reserved_quantity);
            $equip->update(['status' => 'available']);
        }

        return response()->json($res);
    }

    // 🟢 ADDED: DESTROY METHOD (To allow deleting old records)
    public function destroy($id)
    {
        $res = Reservation::findOrFail($id);
        if (!in_array($res->status, ['completed', 'rejected'])) {
            return response()->json(['message' => 'Can only delete completed or rejected reservations'], 422);
        }
        $res->delete();
        return response()->json(['message' => 'Deleted']);
    }
}