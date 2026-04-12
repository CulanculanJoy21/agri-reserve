<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Feedback extends Model
{
    protected $primaryKey = 'feedback_id';

    protected $fillable = ['reservation_id', 'user_id', 'rating', 'comments'];

    protected $casts = ['rating' => 'integer'];

    public function reservation()
    {
        return $this->belongsTo(Reservation::class, 'reservation_id', 'reservation_id');
    }

    public function farmer()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
