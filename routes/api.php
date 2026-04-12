<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\EquipmentController;
use App\Http\Controllers\ReservationController;
use App\Http\Controllers\DeliveryController;
use App\Http\Controllers\MaintenanceController;
use App\Http\Controllers\FeedbackController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SettingsController;


Route::get('/calculate-distance', function(Request $request) {
    $lat2 = (float) $request->query('lat');
    $lng2 = (float) $request->query('lng');

    if (!$lat2 || !$lng2) {
        return response()->json(['error' => 'Coordinates required'], 400);
    }

    // Valencia City, Bukidnon — fixed origin
    $lat1 = 7.9038584645570635;
    $lng1 = 125.09822284783338;

    // Haversine formula
    $earthRadius = 6371; // km

    $dLat = deg2rad($lat2 - $lat1);
    $dLng = deg2rad($lng2 - $lng1);

    $a = sin($dLat/2) * sin($dLat/2)
       + cos(deg2rad($lat1)) * cos(deg2rad($lat2))
       * sin($dLng/2) * sin($dLng/2);

    $c = 2 * atan2(sqrt($a), sqrt(1-$a));

    $straightLine = $earthRadius * $c;

    // Add 25% buffer for road curves and detours
    $roadDistance = $straightLine * 1.25;

    // Estimate drive time (avg 40 km/h on provincial roads)
    $minutes      = round(($roadDistance / 40) * 60);
    $hours        = floor($minutes / 60);
    $mins         = $minutes % 60;
    $duration     = $hours > 0
        ? "{$hours} hr " . ($mins > 0 ? "{$mins} mins" : "")
        : "{$mins} mins";

    return response()->json([
        'status' => 'OK',
        'straight_line_km' => round($straightLine, 2),
        'road_distance_km' => round($roadDistance, 2),
        'duration_text'    => $duration,
        'origin'           => 'Base Location (Valencia City, Bukidnon)',
        'rows' => [[
            'elements' => [[
                'status'   => 'OK',
                'distance' => [
                    'value' => round($roadDistance * 1000),
                    'text'  => round($roadDistance, 1) . ' km'
                ],
                'duration' => [
                    'value' => $minutes * 60,
                    'text'  => $duration
                ]
            ]]
        ]]
    ]);
});

// ── PUBLIC ROUTES (no login needed) ──────────────────────────
Route::post('/auth/login',    [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);
Route::get('/equipment',      [EquipmentController::class, 'index']);
Route::get('/equipment/{id}', [EquipmentController::class, 'show']);

// ── PROTECTED ROUTES (login required) ────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Driver location tracking
    Route::put('/drivers/{id}/location', [UserController::class, 'updateLocation']);
    Route::get('/drivers/locations',     [UserController::class, 'allDriverLocations']);
    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me',      [AuthController::class, 'me']);

    // Users (admin only)
    Route::middleware('role:admin')->group(function () {
        Route::get('/users',         [UserController::class, 'index']);
        Route::post('/users',        [UserController::class, 'store']);
        Route::get('/users/{id}',    [UserController::class, 'show']);
        Route::put('/users/{id}',    [UserController::class, 'update']);
        Route::delete('/users/{id}', [UserController::class, 'destroy']);
        Route::get('/farmers',       [UserController::class, 'farmers']);
        Route::get('/drivers',       [UserController::class, 'drivers']);
    });

    // Equipment (admin CRUD only)
    Route::middleware('role:admin')->group(function () {
        Route::post('/equipment',        [EquipmentController::class, 'store']);
        Route::put('/equipment/{id}',    [EquipmentController::class, 'update']);
        Route::delete('/equipment/{id}', [EquipmentController::class, 'destroy']);
    });

    // Reservations
    Route::get('/reservations',              [ReservationController::class, 'index']);
    Route::get('/reservations/{id}',         [ReservationController::class, 'show']);
    Route::post('/reservations',             [ReservationController::class, 'store']);
    Route::put('/reservations/{id}/approve', [ReservationController::class, 'approve']);
    Route::put('/reservations/{id}/reject',  [ReservationController::class, 'reject']);
    Route::put('/reservations/{id}/complete',[ReservationController::class, 'complete']);
    Route::put('/reservations/{id}/cancel',  [ReservationController::class, 'cancel']);
    Route::delete('/reservations/{id}',      [ReservationController::class, 'destroy']);

    // Deliveries
    Route::get('/deliveries/driver/{driver_id}', [DeliveryController::class, 'driverDeliveries']);
    Route::get('/deliveries',                    [DeliveryController::class, 'index']);
    Route::post('/deliveries',                   [DeliveryController::class, 'store']);
    Route::put('/deliveries/{id}',               [DeliveryController::class, 'update']);
    Route::delete('/deliveries/{id}',            [DeliveryController::class, 'destroy']);

    // Maintenance
    Route::get('/maintenance',                          [MaintenanceController::class, 'index']);
    Route::post('/maintenance',                         [MaintenanceController::class, 'store']);
    Route::get('/maintenance/{id}',                     [MaintenanceController::class, 'show']);
    Route::delete('/maintenance/{id}',                  [MaintenanceController::class, 'destroy']);
    Route::get('/maintenance/equipment/{equipment_id}', [MaintenanceController::class, 'byEquipment']);

    // Feedback
    Route::get('/feedback',      [FeedbackController::class, 'index']);
    Route::post('/feedback',     [FeedbackController::class, 'store']);
    Route::get('/feedback/{id}', [FeedbackController::class, 'show']);

    // Reports (admin only)
    Route::middleware('role:admin')->group(function () {
        Route::get('/reports/equipment-usage', [ReportController::class, 'equipmentUsage']);
        Route::get('/reports/reservations',    [ReportController::class, 'reservations']);
        Route::get('/reports/deliveries',      [ReportController::class, 'deliveries']);
        Route::get('/reports/maintenance',     [ReportController::class, 'maintenance']);
        Route::get('/reports/farmers',         [ReportController::class, 'farmers']);
        Route::get('/reports/full',            [ReportController::class, 'full']);
    });

    // Settings (admin only)
    Route::get('/settings', [SettingsController::class, 'index']);
    Route::put('/settings',  [SettingsController::class, 'update']);
});