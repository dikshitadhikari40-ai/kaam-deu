# 🚀 Copy-Paste Migration Guide - Supabase

## Step 1: Open Supabase Dashboard

1. Go to: **https://supabase.com/dashboard**
2. Log in to your account
3. Click on your **Kaam Deu project**

---

## Step 2: Open SQL Editor

1. In the left sidebar, click **"SQL Editor"**
2. Click the **"New Query"** button (top right)

---

## Step 3: Copy the Migration File

1. Open the file: `supabase/SR_DECISION_ENGINE.sql` (it's already open in your editor)
2. Select **ALL** the text:
   - Press `Cmd+A` (Mac) or `Ctrl+A` (Windows/Linux)
3. Copy it:
   - Press `Cmd+C` (Mac) or `Ctrl+C` (Windows/Linux)

---

## Step 4: Paste and Run in Supabase

1. Go back to Supabase SQL Editor
2. Click in the query box
3. Paste the migration:
   - Press `Cmd+V` (Mac) or `Ctrl+V` (Windows/Linux)
4. Click the **"Run"** button (or press `Cmd+Enter` / `Ctrl+Enter`)
5. Wait 10-30 seconds for it to complete

---

## Step 5: Verify It Worked

After running, paste this verification query in a NEW query and run it:

```sql
-- Check if premium columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('is_premium', 'premium_tier', 'premium_expires_at')
ORDER BY column_name;
```

**Expected Result:** You should see 3 rows:
- `is_premium` (boolean)
- `premium_expires_at` (timestamp with time zone)
- `premium_tier` (text)

---

## Step 6: Check Functions Were Created

Run this query:

```sql
-- Check if RPC functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_decision_cards',
    'compare_identities',
    'check_premium_access',
    'is_feature_enabled'
  )
ORDER BY routine_name;
```

**Expected Result:** You should see 4 rows:
- `check_premium_access`
- `compare_identities`
- `get_decision_cards`
- `is_feature_enabled`

---

## ✅ Success!

If you see all the expected results above, the migration was successful! 🎉

---

## 🐛 Troubleshooting

### If you see: "relation 'work_identities' does not exist"
**Solution:** You need to run `WORK_IDENTITY_SYSTEM.sql` first. Let me know and I'll help you with that.

### If you see: "column already exists"
**Solution:** That's okay! The column already exists, so you can skip that part. The migration should continue.

### If you see other errors
**Solution:** Copy the error message and share it with me. I'll help you fix it.

---

## Next Steps After Migration

1. Test the app:
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev
   
   # Terminal 2: Frontend
   cd frontend && npm start
   ```

2. Try the premium features in the app!

---

**Ready? Start with Step 1 above!** 🚀
