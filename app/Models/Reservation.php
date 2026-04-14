<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Reservation extends Model
{
    protected $primaryKey = 'reservation_id';

    protected $fillable = [
        'user_id', 'equipment_id', 'reserved_quantity', 'start_date', 'end_date',
        'reservation_type', 'status', 'notes', 'delivery_address', 'latitude', 
        'longitude', 'returned_at', 'total_days', 'total_rental_cost'
    ];

    // 🟢 This makes "quantity" and "address" available to your JavaScript app.js
    protected $appends = ['quantity', 'address'];

    protected $casts = [
        'latitude'          => 'float',
        'longitude'         => 'float',
        'start_date'        => 'date:Y-m-d',
        'end_date'          => 'date:Y-m-d',
        'returned_at'       => 'datetime', 
        'total_rental_cost' => 'decimal:2',
    ];

    public function farmer()    { return $this->belongsTo(User::class, 'user_id'); }
    public function equipment() { return $this->belongsTo(Equipment::class, 'equipment_id', 'equipment_id'); }
    public function delivery()  { return $this->hasOne(Delivery::class, 'reservation_id', 'reservation_id'); }
    public function feedback()  { return $this->hasOne(Feedback::class, 'reservation_id', 'reservation_id'); }

    // 🟢 Aliases so your Web App's "Eye" and "Assign" buttons work again
    public function getQuantityAttribute() { return $this->reserved_quantity; }
    public function getAddressAttribute()  { return $this->delivery_address; }

    public function getRentalCostAttribute(): float
    {
        if (!$this->start_date || !$this->end_date || !$this->equipment) return 0.00;
        $start = Carbon::parse($this->start_date);
        $end   = Carbon::parse($this->end_date);
        $days  = max(1, $end->diffInDays($start) + 1);
        return $days * ($this->equipment->rental_price * ($this->reserved_quantity ?? 1));
    }
}