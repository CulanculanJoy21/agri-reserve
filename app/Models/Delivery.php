<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Delivery extends Model
{
    protected $primaryKey = 'delivery_id';
    public $incrementing = true;

    protected $fillable = [
    'reservation_id', 'driver_id', 'distance_km', 'price_per_km',
    'delivery_fee', 'delivery_status', 'delivery_date',
    'delivery_address', 'latitude', 'longitude'
    ];

    protected $casts = [
        'latitude'  => 'float',
        'longitude' => 'float',
        'distance_km' => 'float',
        'delivery_fee' => 'float',
    ];

    public function reservation()
    {
        return $this->belongsTo(Reservation::class, 'reservation_id', 'reservation_id');
    }

    public function driver()
    {
        return $this->belongsTo(User::class, 'driver_id', 'id');
    }

    protected static function boot()
    {
        parent::boot();
        static::saving(function ($model) {
            $model->delivery_fee = $model->distance_km * $model->price_per_km;
        });
    }
}
