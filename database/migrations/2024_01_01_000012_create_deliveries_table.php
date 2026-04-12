<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
{
        Schema::create('deliveries', function (Blueprint $table) {
            $table->id('delivery_id');
            $table->unsignedBigInteger('reservation_id');
            $table->unsignedBigInteger('driver_id')->nullable();
            $table->decimal('distance_km', 8, 2)->default(0);
            $table->decimal('price_per_km', 8, 2)->default(25);
            $table->decimal('delivery_fee', 10, 2)->default(0);
            $table->enum('delivery_status', ['pending', 'in_transit', 'delivered'])->default('pending');
            $table->date('delivery_date')->nullable();
            
            // 📍 PUTTING THESE BACK IN THE TABLE
            $table->text('delivery_address')->nullable();
            $table->string('latitude', 50)->nullable();
            $table->string('longitude', 50)->nullable();
            
            $table->text('delivery_notes')->nullable();
            $table->timestamps();

            $table->foreign('reservation_id')->references('reservation_id')->on('reservations')->onDelete('cascade');
            $table->foreign('driver_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void { Schema::dropIfExists('deliveries'); }
};
