<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Reservation extends Model
{
    protected $primaryKey = 'reservation_id';

    protected $fillable = [
        'user_id', 
        'equipment_id', 
        'reserved_quantity',
        'start_date', 
        'end_date',
        'reservation_type', 
        'status', 
        'notes',
        'delivery_address', 
        'latitude', 
        'longitude',
        'returned_at',          
        'total_days',           
        'total_rental_cost'     
    ];

    protected $casts = [
        'latitude'          => 'float',
        'longitude'         => 'float',
        'start_date'        => 'date:Y-m-d',
        'end_date'          => 'date:Y-m-d',
        'returned_at'       => 'datetime', 
        'total_rental_cost' => 'decimal:2',
    ];

    public function farmer()   { return $this->belongsTo(User::class, 'user_id'); }
    public function equipment(){ return $this->belongsTo(Equipment::class, 'equipment_id', 'equipment_id'); }
    public function delivery() { return $this->hasOne(Delivery::class, 'reservation_id', 'reservation_id'); }
    public function feedback() { return $this->hasOne(Feedback::class, 'reservation_id', 'reservation_id'); }


    public function getRentalCostAttribute(): float
    {
        $days = max(1, $this->start_date->diffInDays($this->end_date));
        return $days * ($this->equipment->rental_price ?? 0);
    }
}