<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Equipment;

class EquipmentController extends Controller
{
    public function index(Request $request)
    {
        $query = Equipment::with(['lastMaintenance']);

        // 1. If a specific status is requested (like from Admin panel), use it
        if ($request->status) {
            $query->where('status', $request->status);
        } 
        // 2. Default behavior for the Mobile App / Farmers: Show ONLY available
        else if ($request->user() && $request->user()->role === 'farmer') {
            $query->where('status', 'available');
        }

        if ($request->category) $query->where('category', $request->category);
        
        if ($request->search) {
            $query->where('equipment_name', 'like', "%{$request->search}%");
        }

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
            'equipment_name'     => 'required|string|max:100',
            'category'           => 'required|string|max:100',
            'description'        => 'nullable|string',
            'rental_price'       => 'required|numeric|min:0',
            'status'             => 'in:available,reserved,maintenance',
            'location'           => 'nullable|string|max:255',
            'image'              => 'nullable|string',
            'quantity'           => 'nullable|integer|min:1',           // 🟢 ADDED
            'available_quantity' => 'nullable|integer|min:0',           // 🟢 ADDED
        ]);
        
        // If not provided, default to 1
        $data['quantity'] = $data['quantity'] ?? 1;
        $data['available_quantity'] = $data['available_quantity'] ?? $data['quantity'];

        return response()->json(Equipment::create($data), 201);
    }

    public function update(Request $request, $id)
    {
        $equip = Equipment::findOrFail($id);
        
        $validatedData = $request->validate([
            'equipment_name'     => 'sometimes|string|max:100',
            'category'           => 'sometimes|string|max:100',
            'description'        => 'nullable|string',
            'rental_price'       => 'sometimes|numeric|min:0',
            'status'             => 'sometimes|in:available,reserved,maintenance',
            'location'           => 'nullable|string|max:255',
            'image'              => 'nullable|string',
            'quantity'           => 'sometimes|integer|min:1',           // 🟢 ADDED
            'available_quantity' => 'sometimes|integer|min:0',           // 🟢 ADDED
        ]);

        $equip->update($validatedData);
        
        return response()->json($equip);
    }

    public function destroy($id)
    {
        Equipment::findOrFail($id)->delete();
        return response()->json(['message' => 'Equipment deleted']);
    }
}
