<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Maintenance;
use App\Models\Equipment;

class MaintenanceController extends Controller
{
    public function index()
    {
        return response()->json(
            Maintenance::with('equipment')->latest('maintenance_date')->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'equipment_id'     => 'required|exists:equipment,equipment_id',
            'maintenance_date' => 'required|date',
            'description'      => 'required|string',
            'cost'             => 'nullable|numeric|min:0',
            'technician'       => 'nullable|string|max:100',
        ]);

        $maintenance = Maintenance::create($data);

        Equipment::where('equipment_id', $data['equipment_id'])
            ->update(['status' => 'maintenance']);

        return response()->json($maintenance->load('equipment'), 201);
    }

    public function show($id)
    {
        return response()->json(Maintenance::with('equipment')->findOrFail($id));
    }

    public function destroy($id)
    {
        Maintenance::findOrFail($id)->delete();
        return response()->json(['message' => 'Maintenance record deleted']);
    }

    public function byEquipment($equipment_id)
    {
        return response()->json(
            Maintenance::where('equipment_id', $equipment_id)
                ->latest('maintenance_date')->get()
        );
    }
}
