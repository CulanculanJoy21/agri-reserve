<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Maintenance extends Model
{
    protected $primaryKey = 'maintenance_id';
    protected $table = 'maintenance';

    protected $fillable = [
        'equipment_id', 'maintenance_date', 'description', 'cost', 'technician'
    ];

    protected $casts = [
        'maintenance_date' => 'date',
        'cost'             => 'float',
    ];

    public function equipment()
    {
        return $this->belongsTo(Equipment::class, 'equipment_id', 'equipment_id');
    }
}
