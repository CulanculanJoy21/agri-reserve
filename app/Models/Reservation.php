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

    // These fields are sent automatically to your Web App and Android App
    protected $appends = ['quantity', 'address', 'rental_total', 'shipping_fee', 'grand_total'];

    protected $casts = [
        'latitude'          => 'float',
        'longitude'         => 'float',
        'start_date'        => 'date:Y-m-d',
        'end_date'          => 'date:Y-m-d',
        'returned_at'       => 'datetime', 
        'total_rental_cost' => 'float',
    ];

    public function farmer()    { return $this->belongsTo(User::class, 'user_id'); }
    public function equipment() { return $this->belongsTo(Equipment::class, 'equipment_id', 'equipment_id'); }
    public function delivery()  { return $this->hasOne(Delivery::class, 'reservation_id', 'reservation_id'); }
    public function feedback()  { return $this->hasOne(Feedback::class, 'reservation_id', 'reservation_id'); }

    // --- ALIASES FOR WEB APP COMPATIBILITY ---
    public function getQuantityAttribute() { return $this->reserved_quantity; }
    public function getAddressAttribute()  { return $this->delivery_address; }

    // --- FINANCIAL BREAKDOWN METHODS ---

    /**
     * Equipment Rental Cost (Days * Price * Qty)
     */
    public function getRentalTotalAttribute()
    {
        // Use the column value if it exists, otherwise calculate it
        if ($this->total_rental_cost > 0) return (float) $this->total_rental_cost;
        
        $start = Carbon::parse($this->start_date);
        $end   = Carbon::parse($this->end_date);
        $days  = max(1, $end->diffInDays($start) + 1);
        return (float) ($days * ($this->equipment->rental_price ?? 0) * ($this->reserved_quantity ?? 1));
    }

    /**
     * Shipping/Delivery Fee from relationship
     */
    public function getShippingFeeAttribute()
    {
        return (float) ($this->delivery->delivery_fee ?? 0);
    }

    /**
     * Final Grand Total
     */
    public function getGrandTotalAttribute()
    {
        return $this->getRentalTotalAttribute() + $this->getShippingFeeAttribute();
    }
}