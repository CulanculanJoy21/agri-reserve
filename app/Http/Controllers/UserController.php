<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::query();
        if ($request->role)   $query->where('role', $request->role);
        if ($request->search) $query->where('name', 'like', "%{$request->search}%");
        return response()->json($query->latest()->get());
    }

    public function farmers()
    {
        return response()->json(
            User::where('role', 'farmer')
                ->withCount('reservations')
                ->latest()
                ->get()
        );
    }

    public function drivers()
    {
        return response()->json(
            User::where('role', 'driver')
                ->withCount('deliveries')
                ->latest()
                ->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'     => 'required|string|max:100',
            'email'    => 'required|email|unique:users',
            'password' => 'required|min:6',
            'role'     => 'required|in:admin,farmer,driver',
            'phone'    => 'nullable|string|max:20',
            'address'  => 'nullable|string',
        ]);

        $user = User::create([
            ...$data,
            'password' => Hash::make($data['password']),
        ]);

        return response()->json($user, 201);
    }

    public function show($id)
{
    return response()->json(
        User::with([
            'reservations.equipment',
            'deliveries.reservation.equipment',
            'deliveries.reservation.farmer',
        ])->findOrFail($id)
    );
}
    // Driver updates their own location
   // Method 1: Saves the phone's GPS to the DB
    public function updateLocation(Request $request)
    {
        $request->validate([
            'latitude'  => 'required|numeric',
            'longitude' => 'required|numeric',
        ]);

        $request->user()->update([
            'current_lat'         => $request->latitude,
            'current_lng'         => $request->longitude,
            'location_updated_at' => now(),
        ]);

        return response()->json(['status' => 'success']);
    }
    public function getActiveDriverLocations()
    {
        $drivers = User::where('role', 'driver')
            ->whereNotNull('current_lat')
            ->whereNotNull('current_lng')
            // This is key for the defense: it filters out inactive drivers
            ->where('location_updated_at', '>=', now()->subMinutes(30))
            ->get(['id', 'name', 'current_lat', 'current_lng', 'location_updated_at']);

        return response()->json($drivers);
    }

    // Method 2: Sends all active drivers to the Map
    public function allDriverLocations()
    {
        return response()->json(
            User::where('role', 'driver')
                ->whereNotNull('current_lat')
                ->where('location_updated_at', '>=', now()->subMinutes(30))
                ->get(['id', 'name', 'current_lat', 'current_lng', 'location_updated_at'])
        );
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $data = $request->validate([
            'name'      => 'sometimes|string|max:100',
            'phone'     => 'sometimes|string|max:20',
            'address'   => 'sometimes|string',
            'role'      => 'sometimes|in:admin,farmer,driver',
            'is_active' => 'sometimes|boolean',
        ]);
        if ($request->password) {
            $data['password'] = Hash::make($request->password);
        }
        $user->update($data);
        return response()->json($user);
    }

    public function destroy($id)
    {
        User::findOrFail($id)->delete();
        return response()->json(['message' => 'User deleted']);
    }
}
