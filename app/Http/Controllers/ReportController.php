<?php

namespace App\Http\Controllers;

use App\Models\Equipment;
use App\Models\Reservation;
use App\Models\Delivery;
use App\Models\Maintenance;
use App\Models\Feedback;
use App\Models\User;

class ReportController extends Controller
{
    public function equipmentUsage()
    {
        return response()->json(
            Equipment::withCount('reservations')
                ->with('lastMaintenance')
                ->orderByDesc('reservations_count')
                ->get()
        );
    }

    public function reservations()
    {
        return response()->json([
            'by_status' => Reservation::selectRaw('status, count(*) as count')->groupBy('status')->get(),
            'by_type'   => Reservation::selectRaw('reservation_type, count(*) as count')->groupBy('reservation_type')->get(),
            'monthly'   => Reservation::selectRaw('MONTH(created_at) as month, count(*) as count')
                ->whereYear('created_at', date('Y'))
                ->groupBy('month')->orderBy('month')->get(),
        ]);
    }

    public function deliveries()
    {
        return response()->json([
            'deliveries'  => Delivery::with(['driver', 'reservation.farmer'])->get(),
            'total_fees'  => Delivery::sum('delivery_fee'),
            'by_status'   => Delivery::selectRaw('delivery_status, count(*) as count')->groupBy('delivery_status')->get(),
        ]);
    }

    public function maintenance()
    {
        return response()->json([
            'records'    => Maintenance::with('equipment')->latest()->get(),
            'total_cost' => Maintenance::sum('cost'),
        ]);
    }

    public function farmers()
    {
        return response()->json(
            User::where('role', 'farmer')
                ->withCount('reservations')
                ->orderByDesc('reservations_count')
                ->get()
        );
    }

    public function full()
    {
        return response()->json([
            'equipment_count'    => Equipment::count(),
            'available_count'    => Equipment::where('status', 'available')->count(),
            'reservation_count'  => Reservation::count(),
            'pending_count'      => Reservation::where('status', 'pending')->count(),
            'total_delivery_fee' => Delivery::sum('delivery_fee'),
            'total_maint_cost'   => Maintenance::sum('cost'),
            'farmer_count'       => User::where('role', 'farmer')->count(),
            'driver_count'       => User::where('role', 'driver')->count(),
            'avg_rating'         => Feedback::avg('rating'),
        ]);
    }
}
