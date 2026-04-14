<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('equipment', function (Blueprint $table) {
            // Add quantity and available_quantity after rental_price
            $table->integer('quantity')->default(1)->after('rental_price');
            $table->integer('available_quantity')->default(1)->after('quantity');
        });
    }

    public function down(): void
    {
        Schema::table('equipment', function (Blueprint $table) {
            $table->dropColumn(['quantity', 'available_quantity']);
        });
    }
};
