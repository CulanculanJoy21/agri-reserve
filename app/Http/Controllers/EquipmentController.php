<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Equipment;

class EquipmentController extends Controller
{
    public function index(Request $request)
    {
        $query = Equipment::with(['lastMaintenance']);
        if ($request->status)   $query->where('status', $request->status);
        if ($request->category) $query->where('category', $request->category);
        if ($request->search)   $query->where('equipment_name', 'like', "%{$request->search}%");
        return response()->json($query->latest()->get());
    }

    public function show($id)
    {
        return response()->json(
            Equipment::with(['maintenance', 'reservations.farmer'])->findOrFail($id)
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'equipment_name' => 'required|string|max:100',
            'category'       => 'required|string|max:100',
            'description'    => 'nullable|string',
            'rental_price'   => 'required|numeric|min:0',
            'status'         => 'in:available,reserved,maintenance',
            'location'       => 'nullable|string|max:255',
            'image'          => 'nullable|string',
        ]);
        return response()->json(Equipment::create($data), 201);
    }

    public function update(Request $request, $id)
    {
        $equip = Equipment::findOrFail($id);
        $equip->update($request->validate([
            'equipment_name' => 'sometimes|string|max:100',
            'category'       => 'sometimes|string|max:100',
            'description'    => 'nullable|string',
            'rental_price'   => 'sometimes|numeric|min:0',
            'status'         => 'sometimes|in:available,reserved,maintenance',
            'location'       => 'nullable|string|max:255',
            'image'          => 'nullable|string',
        ]));
        return response()->json($equip);
    }

    public function destroy($id)
    {
        Equipment::findOrFail($id)->delete();
        return response()->json(['message' => 'Equipment deleted']);
    }
}
