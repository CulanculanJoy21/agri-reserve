<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('maintenance', function (Blueprint $table) {
            $table->id('maintenance_id');
            $table->unsignedBigInteger('equipment_id');
            $table->date('maintenance_date');
            $table->text('description');
            $table->decimal('cost', 10, 2)->default(0);
            $table->string('technician', 100)->nullable();
            $table->timestamps();

            $table->foreign('equipment_id')->references('equipment_id')->on('equipment')->onDelete('cascade');
        });
    }

    public function down(): void { Schema::dropIfExists('maintenance'); }
};
