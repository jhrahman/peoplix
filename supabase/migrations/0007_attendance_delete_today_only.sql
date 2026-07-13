-- Anyone can delete their own attendance record for today, so they can re-check-in.
-- No one (including hr/admin) can delete a past attendance record — history must stay intact.
drop policy if exists "attendance_delete_staff" on public.attendance;

create policy "attendance_delete_own_today"
  on public.attendance for delete
  using (
    employee_id = auth.uid()
    and date = (now() at time zone 'Asia/Dhaka')::date
  );
