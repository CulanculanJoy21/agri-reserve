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
    // ── GET ALL ────────────────────────────────────────────
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
 
    // ── GET ONE ────────────────────────────────────────────
    public function show($id)
    {
        $res = Reservation::with(['farmer', 'equipment', 'delivery.driver', 'feedback'])
            ->findOrFail($id);
        return response()->json($res);
    }
 
    // ── CREATE ─────────────────────────────────────────────
    public function store(Request $request)
    {
        $data = $request->validate([
            'equipment_id'      => 'required|exists:equipment,equipment_id',
            'reserved_quantity' => 'required|integer|min:1', // 🟢 New field
            'start_date'        => 'required|date',
            'end_date'          => 'required|date|after_or_equal:start_date',
            'reservation_type'  => 'required|in:pickup,delivery',
            'notes'             => 'nullable|string',
            'delivery_address'  => 'nullable|string',
            'latitude'          => 'nullable|numeric',
            'longitude'         => 'nullable|numeric',
            'user_id'           => 'nullable|exists:users,id',
        ]);

        // Set User ID
        $data['user_id'] = ($request->user()->role === 'admin') 
            ? ($request->input('user_id') ?? $request->user()->id) 
            : $request->user()->id;

        $data['status'] = 'pending';
        $equip = Equipment::findOrFail($data['equipment_id']);
        $qtyRequested = $data['reserved_quantity'];

        // 🟢 Check if enough units are available
        if (($equip->available_quantity) < $qtyRequested) {
            return response()->json(['message' => "Only {$equip->available_quantity} units available"], 422);
        }

        // Calculate Costs (Days * Price * Quantity)
        $startDate = Carbon::parse($data['start_date']);
        $endDate   = Carbon::parse($data['end_date']);
        $totalDays = $endDate->diffInDays($startDate) + 1;
        
        $data['total_days']        = $totalDays;
        $data['total_rental_cost'] = $totalDays * ($equip->rental_price * $qtyRequested);

        // 🟢 Deduct the EXACT requested quantity
        $equip->decrement('available_quantity', $qtyRequested);

        // Update status to 'reserved' only if total stock hits zero
        if ($equip->available_quantity <= 0) {
            $equip->update(['status' => 'reserved']);
        }

        $res = Reservation::create($data);

        return response()->json(
            Reservation::with(['farmer', 'equipment', 'delivery.driver'])->find($res->reservation_id),
            201
        );
    }
 
    // ── APPROVE ─────────────────────────────────────────────
    public function approve($id)
    {
        $res = Reservation::with('equipment')->findOrFail($id);
        $res->update(['status' => 'approved']);
 
        // Auto-create delivery for delivery type
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
 
    // ── REJECT ─────────────────────────────────────────────
    public function reject($id)
    {
        $res = Reservation::with('equipment')->findOrFail($id);
        $res->update(['status' => 'rejected']);
 
        // Restore quantity
        if ($res->equipment) {
            $res->equipment->increment('available_quantity', $res->reserved_quantity);  
        if ($res->equipment->status === 'reserved') {
            $res->equipment->update(['status' => 'available']);
    }
}
 
        return response()->json($res);
    }
 
    // ── COMPLETE (pickup done) ─────────────────────────────
    public function complete($id)
    {
        $res = Reservation::with('equipment')->findOrFail($id);
        $res->update(['status' => 'completed']);
        if ($res->equipment) $res->equipment->update(['status' => 'available']);
        return response()->json($res);
    }
 
    // ── CANCEL ─────────────────────────────────────────────
    public function cancel($id)
    {
        $res = Reservation::with('equipment')->findOrFail($id);
        if (!in_array($res->status, ['pending', 'approved', 'assigned'])) {
            return response()->json(['message' => 'Cannot cancel this reservation'], 422);
        }
        $res->update(['status' => 'rejected']);
 
        // Restore quantity
        if ($res->equipment) {
        $res->equipment->increment('available_quantity', $res->reserved_quantity);
        
        if ($res->equipment->status === 'reserved') {
            $res->equipment->update(['status' => 'available']);
        }
    }
 
        return response()->json($res);
    }
 
    // ── RETURN EQUIPMENT ───────────────────────────────────
    // Called by admin OR driver when equipment is returned
    public function returnEquipment($id)
    {
        $res   = Reservation::with('equipment')->findOrFail($id);
        $equip = $res->equipment;
 
        // Calculate actual days used
        $startDate  = Carbon::parse($res->start_date);
        $returnDate = Carbon::now();
        $actualDays = $returnDate->diffInDays($startDate) + 1;
        $totalCost  = $actualDays * ($equip ? $equip->rental_price : 0);
 
        $res->update([
            'status'            => 'completed',
            'returned_at'       => now(),
            'total_days'        => $actualDays,
            'total_rental_cost' => $totalCost,
        ]);
 
        // Restore quantity
        if ($equip) {
            $equip->increment('available_quantity');
            if ($equip->status === 'reserved') {
                $equip->update(['status' => 'available']);
            }
        }
 
        return response()->json(
            Reservation::with(['farmer', 'equipment', 'delivery.driver'])->find($id)
        );
    }
 
    // ── DELETE ─────────────────────────────────────────────
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