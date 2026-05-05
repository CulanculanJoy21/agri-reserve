<?php

use Illuminate\Support\Facades\Route;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

Route::get('/', function () {
    return view('dashboard');
});

// Emergency route to create your admin account
Route::get('/force-admin-creation', function () {
    $user = User::updateOrCreate(
        ['email' => 'admin@agricoop.ph'],
        [
            'name' => 'Admin',
            'password' => Hash::make('admin123'), 
            'role' => 'admin',
            'is_active' => true
        ]
    );
    return "Admin account created successfully! You can now login.";
});