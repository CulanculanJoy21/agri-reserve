<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Equipment extends Model
{
    protected $primaryKey = 'equipment_id';

    protected $fillable = [
        'equipment_name', 'category', 'description',
        'rental_price', 'status', 'location', 'image'
    ];

    protected $casts = ['rental_price' => 'float'];

    public function reservations()
    {
        return $this->hasMany(Reservation::class, 'equipment_id', 'equipment_id');
    }

    public function maintenance()
    {
        return $this->hasMany(Maintenance::class, 'equipment_id', 'equipment_id');
    }

    public function lastMaintenance()
    {
        return $this->hasOne(Maintenance::class, 'equipment_id', 'equipment_id')
                    ->latest('maintenance_date');
    }
}
