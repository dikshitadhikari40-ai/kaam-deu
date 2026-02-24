# Database Migration Guide - SR Decision Engine

## 🎯 Purpose
This migration adds premium features, decision cards, and comparison functionality to the Kaam Deu platform.

## ⚠️ IMPORTANT: Before Running

1. **Backup your database** (if in production)
2. **Ensure WORK_IDENTITY_SYSTEM.sql has been run first**
3. **Test in a development/staging environment first**

---

## 📋 Step-by-Step Instructions

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)

### Step 2: Open the Migration File
1. Open `supabase/SR_DECISION_ENGINE.sql` in your code editor
2. Copy the **entire contents** of the file

### Step 3: Run the Migration
1. In Supabase SQL Editor, click **"New Query"**
2. Paste the entire SQL migration
3. Click **"Run"** (or press `Cmd+Enter` / `Ctrl+Enter`)
4. Wait for execution to complete (should take 10-30 seconds)

### Step 4: Verify Success
You should see:
- ✅ Success messages for each section
- ✅ No error messages
- ✅ Query executed successfully

### Step 5: Verify Tables and Functions

Run this verification query in SQL Editor:

```sql
-- Check premium columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('is_premium', 'premium_tier', 'premium_expires_at');

-- Check feature_flags table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'feature_flags'
);

-- Check RPC functions exist
SELECT routine_name, routine_type
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

**Expected Results:**
- ✅ 3 columns in profiles table
- ✅ feature_flags table exists
- ✅ 4 RPC functions exist

---

## 🔍 What This Migration Adds

### 1. Premium Columns (profiles table)
- `is_premium` (BOOLEAN) - Premium status flag
- `premium_tier` (TEXT) - 'free', 'pro', or 'business'
- `premium_expires_at` (TIMESTAMPTZ) - Subscription expiration

### 2. Feature Flags Table
- `feature_flags` table for toggling features
- Default flags for decision cards, compare mode, saved searches

### 3. RPC Functions
- `get_decision_cards()` - Returns decision cards with fit scores
- `compare_identities()` - Compares up to 5 identities side-by-side
- `check_premium_access()` - Returns user's premium status
- `is_feature_enabled()` - Checks if a feature is enabled

### 4. Indexes
- Index on `profiles.is_premium` for faster queries

---

## 🐛 Troubleshooting

### Error: "relation 'work_identities' does not exist"
**Solution:** Run `supabase/WORK_IDENTITY_SYSTEM.sql` first

### Error: "column already exists"
**Solution:** The migration uses `ADD COLUMN IF NOT EXISTS`, so this shouldn't happen. If it does, the column already exists - you can skip that part.

### Error: "type already exists"
**Solution:** The migration uses `DROP TYPE IF EXISTS`, so this shouldn't happen. If it does, the type already exists - safe to ignore.

### Migration Takes Too Long
**Solution:** 
- Check your Supabase project status
- Ensure you're not running other heavy queries
- Try running in smaller chunks (by section)

---

## ✅ Post-Migration Checklist

After running the migration:

- [ ] Premium columns exist in profiles table
- [ ] feature_flags table exists with default rows
- [ ] All 4 RPC functions exist
- [ ] Test `check_premium_access()` function:
  ```sql
  SELECT * FROM check_premium_access();
  ```
- [ ] Test `is_feature_enabled()` function:
  ```sql
  SELECT is_feature_enabled('FEATURE_DECISION_CARDS');
  ```
- [ ] Update a test user to premium (optional):
  ```sql
  UPDATE profiles
  SET is_premium = true, premium_tier = 'business'
  WHERE email = 'your-test-email@example.com';
  ```

---

## 🔄 Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Remove premium columns
ALTER TABLE profiles DROP COLUMN IF EXISTS is_premium;
ALTER TABLE profiles DROP COLUMN IF EXISTS premium_expires_at;
ALTER TABLE profiles DROP COLUMN IF EXISTS premium_tier;

-- Drop feature flags table
DROP TABLE IF EXISTS feature_flags;

-- Drop RPC functions
DROP FUNCTION IF EXISTS get_decision_cards;
DROP FUNCTION IF EXISTS compare_identities;
DROP FUNCTION IF EXISTS check_premium_access;
DROP FUNCTION IF EXISTS is_feature_enabled;

-- Drop types
DROP TYPE IF EXISTS decision_card_result CASCADE;
DROP TYPE IF EXISTS compare_result CASCADE;
```

**⚠️ Warning:** This will remove all premium data. Only use if absolutely necessary.

---

## 📞 Support

If you encounter issues:
1. Check Supabase logs: Dashboard → Logs → Postgres Logs
2. Verify your Supabase project is active
3. Check the migration file for syntax errors
4. Contact support with error messages

---

*Last Updated: January 2026*
