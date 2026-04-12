<?php
namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\Equipment;
use App\Models\Reservation;
use App\Models\Setting;
use Illuminate\Http\Request;

class ReservationController extends Controller
{
    // ── GET ALL (admin gets all, farmer gets own) ──────────
    public function index(Request $request)
{
    $user = $request->user();

    $query = Reservation::with([
        'farmer',
        'equipment',
        'delivery.driver',
        'feedback'
    ]);

    // Farmers only see their own reservations
    if ($user->role === 'farmer') {
        $query->where('user_id', $user->id);
    }

    // Drivers don't see reservations directly
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
            'start_date'        => 'required|date',
            'end_date'          => 'required|date|after_or_equal:start_date',
            'reservation_type'  => 'required|in:pickup,delivery',
            'notes'             => 'nullable|string',
            'delivery_address'  => 'nullable|string',
            'latitude'          => 'nullable|numeric',
            'longitude'         => 'nullable|numeric',
            'user_id'           => 'nullable|exists:users,id',
        ]);

        // Admin can create for a farmer, farmer creates for themselves
        if ($request->user()->role === 'admin') {
            $data['user_id'] = $request->input('user_id') ?? $request->user()->id;
        } else {
            $data['user_id'] = $request->user()->id;
        }
        $data['status']  = 'pending';

        $equip = Equipment::findOrFail($data['equipment_id']);
        $equip->update(['status' => 'reserved']);

        $res = Reservation::create($data);

        return response()->json(
            Reservation::with(['farmer', 'equipment', 'delivery.driver'])->find($res->reservation_id),
            201
        );
    }

    // ── APPROVE ────────────────────────────────────────────
    public function approve($id)
    {
        $res = Reservation::with('equipment')->findOrFail($id);
        $res->update(['status' => 'approved']);

        // Auto-create delivery record for delivery type
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
        if ($res->equipment) $res->equipment->update(['status' => 'available']);
        return response()->json($res);
    }

    // ── COMPLETE ───────────────────────────────────────────
    public function complete($id)
    {
        $res = Reservation::with('equipment')->findOrFail($id);
        $res->update(['status' => 'completed']);
        if ($res->equipment) $res->equipment->update(['status' => 'available']);
        return response()->json($res);
    }

    // ── CANCEL (farmer cancels own reservation) ────────────
    public function cancel($id)
    {
        $res = Reservation::with('equipment')->findOrFail($id);
        if (!in_array($res->status, ['pending', 'approved'])) {
            return response()->json(['message' => 'Cannot cancel this reservation'], 422);
        }
        $res->update(['status' => 'rejected']);
        if ($res->equipment) $res->equipment->update(['status' => 'available']);
        return response()->json($res);
    }

    // ── DELETE ─────────────────────────────────────────────
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