<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $primaryKey = 'id';
    

    protected $fillable = [
        'name', 'email', 'password', 'role',
        'phone', 'address', 'profile_photo', 'fcm_token', 'is_active',
        'current_lat', 'current_lng', 'location_updated_at'
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = ['is_active' => 'boolean'];

    public function reservations()
    {
        return $this->hasMany(Reservation::class, 'user_id', 'id');
    }

    public function deliveries()
    {
        return $this->hasMany(Delivery::class, 'driver_id', 'id');
    }

    public function feedback()
    {
        return $this->hasMany(Feedback::class, 'user_id', 'id');
    }

    public function isFarmer(): bool { return $this->role === 'farmer'; }
    public function isAdmin(): bool  { return $this->role === 'admin'; }
    public function isDriver(): bool { return $this->role === 'driver'; }
}
