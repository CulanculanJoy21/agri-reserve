<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('reservations', function (Blueprint $table) {
            $table->id('reservation_id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('equipment_id');
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('reservation_type', ['pickup', 'delivery'])->default('pickup');
            $table->enum('status', ['pending', 'approved', 'rejected', 'assigned', 'completed'])->default('pending');
            $table->text('notes')->nullable();
            $table->string('delivery_address')->nullable();
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('equipment_id')->references('equipment_id')->on('equipment')->onDelete('cascade');
        });
    }

    public function down(): void { Schema::dropIfExists('reservations'); }
};
