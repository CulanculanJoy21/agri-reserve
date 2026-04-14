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

    public function show($id)
    {
        $res = Reservation::with(['farmer', 'equipment', 'delivery.driver', 'feedback'])
            ->findOrFail($id);
        return response()->json($res);
    }

    public function store(Request $request)
    {
        // 1. Validate: Look for 'reserved_quantity' (matching your SerializedName in Android)
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
            'user_id'           => 'nullable|exists:users,id',
        ]);

        // 2. Set User ID
        $data['user_id'] = ($request->user()->role === 'admin') 
            ? ($request->input('user_id') ?? $request->user()->id) 
            : $request->user()->id;

        $data['status'] = 'pending';
        
        // 3. Find Equipment using the correct primary key
        $equip = Equipment::where('equipment_id', $data['equipment_id'])->firstOrFail();
        $qtyRequested = $data['reserved_quantity'];

        // 4. Check availability
        if ($equip->available_quantity < $qtyRequested) {
            return response()->json(['message' => "Only {$equip->available_quantity} units available"], 422);
        }

        // 5. Calculate Costs
        $startDate = Carbon::parse($data['start_date']);
        $endDate   = Carbon::parse($data['end_date']);
        $totalDays = $endDate->diffInDays($startDate) + 1;
        
        $data['total_days']        = $totalDays;
        $data['total_rental_cost'] = $totalDays * ($equip->rental_price * $qtyRequested);

        // 6. Deduct stock
        $equip->decrement('available_quantity', $qtyRequested);

        if ($equip->available_quantity <= 0) {
            $equip->update(['status' => 'reserved']);
        }

        // 7. Create Reservation
        $res = Reservation::create($data);

        return response()->json(
            Reservation::with(['farmer', 'equipment', 'delivery.driver'])->find($res->reservation_id),
            201
        );
    }

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

        return response()->json(
            Reservation::with(['farmer', 'equipment', 'delivery.driver'])->find($id)
        );
    }

    public function reject($id)
    {
        $res = Reservation::with('equipment')->findOrFail($id);
        $res->update(['status' => 'rejected']);

        if ($res->equipment) {
            // Restore using correct DB column name
            $res->equipment->increment('available_quantity', $res->reserved_quantity); 
            if ($res->equipment->status === 'reserved') {
                $res->equipment->update(['status' => 'available']);
            }
        }

        return response()->json($res);
    }

    public function cancel($id)
    {
        $res = Reservation::with('equipment')->findOrFail($id);
        if (!in_array($res->status, ['pending', 'approved', 'assigned'])) {
            return response()->json(['message' => 'Cannot cancel this reservation'], 422);
        }
        $res->update(['status' => 'rejected']);

        if ($res->equipment) {
            $res->equipment->increment('available_quantity', $res->reserved_quantity);
            if ($res->equipment->status === 'reserved') {
                $res->equipment->update(['status' => 'available']);
            }
        }

        return response()->json($res);
    }

    public function returnEquipment($id)
    {
        $res   = Reservation::with('equipment')->findOrFail($id);
        $equip = $res->equipment;

        $startDate  = Carbon::parse($res->start_date);
        $returnDate = Carbon::now();
        $actualDays = $returnDate->diffInDays($startDate) + 1;
        
        // Calculate based on reserved_quantity
        $totalCost = $actualDays * ($equip->rental_price * $res->reserved_quantity);

        $res->update([
            'status'            => 'completed',
            'returned_at'       => now(),
            'total_days'        => $actualDays,
            'total_rental_cost' => $totalCost,
        ]);

        if ($equip) {
            $equip->increment('available_quantity', $res->reserved_quantity);
            if ($equip->status === 'reserved') {
                $equip->update(['status' => 'available']);
            }
        }

        return response()->json(
            Reservation::with(['farmer', 'equipment', 'delivery.driver'])->find($id)
        );
    }

    public function destroy($id)
    {
        $res = Reservation::findOrFail($id);
        if (!in_array($res->status, ['completed', 'rejected'])) {
            return response()->json(['message' => 'Can only delete completed or rejected'], 422);
        }
        $res->delete();
        return response()->json(['message' => 'Deleted']);
    }
}