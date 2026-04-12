<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    protected function redirectTo(Request $request): ?string
    {
        return null;
    }
}
```

**5.** Save **(Ctrl+S)**

**6.** Also copy your `RoleMiddleware.php` file into this same `Middleware` folder

---

Then refresh your browser at:
```
http://127.0.0.1:8000/api/equipment