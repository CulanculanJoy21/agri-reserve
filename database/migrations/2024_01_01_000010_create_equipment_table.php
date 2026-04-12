<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('equipment', function (Blueprint $table) {
            $table->id('equipment_id');
            $table->string('equipment_name', 100);
            $table->string('category', 100);
            $table->text('description')->nullable();
            $table->decimal('rental_price', 10, 2)->default(0);
            $table->enum('status', ['available', 'reserved', 'maintenance'])->default('available');
            $table->string('location', 255)->nullable();
            $table->string('image')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void { Schema::dropIfExists('equipment'); }
};
