<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Feedback;
use App\Models\Reservation;

class FeedbackController extends Controller
{
    public function index()
    {
        return response()->json(
            Feedback::with(['farmer', 'reservation.equipment'])->latest()->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'reservation_id' => 'required|exists:reservations,reservation_id',
            'rating'         => 'required|integer|min:1|max:5',
            'comments'       => 'nullable|string',
        ]);

        $res = Reservation::where('reservation_id', $data['reservation_id'])
            ->where('user_id', $request->user()->id)
            ->where('status', 'completed')
            ->firstOrFail();

        $feedback = Feedback::updateOrCreate(
            ['reservation_id' => $data['reservation_id']],
            ['user_id' => $request->user()->id, ...$data]
        );

        return response()->json($feedback->load(['farmer', 'reservation.equipment']), 201);
    }

    public function show($id)
    {
        return response()->json(
            Feedback::with(['farmer', 'reservation.equipment'])->findOrFail($id)
        );
    }
}
