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

    // --- FIXED STORE METHOD ---
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'     => 'required|string|max:100',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|min:6', // Matches your 6-char UI requirement
            'role'     => 'required|in:admin,farmer,driver',
            'phone'    => 'nullable|string|max:20',
            'address'  => 'nullable|string',
        ]);

        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
            'role'     => $data['role'],
            'phone'    => $data['phone'] ?? null,
            'address'  => $data['address'] ?? null,
            'is_active'=> true
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

    // Method for Map Tracking
    public function allDriverLocations()
    {
        return response()->json(
            User::where('role', 'driver')
                ->whereNotNull('current_lat')
                ->where('location_updated_at', '>=', now()->subHours(24))
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