<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::table('reservations', function (Blueprint $table) {
            // Change it to string so it accepts any status word we send
            $table->string('status')->change(); 
        });
    }

    public function down()
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->enum('status', ['pending', 'approved', 'assigned', 'rejected', 'completed', 'cancelled'])->change();
        });
    }
};