-- Finezza_RB seed data (patients, appointments, finance)
-- WARNING: This script deletes existing data for the clinic slug "finezza-rb".
-- It expects a user in auth.users with email finezza@gmail.com.
--
-- Helper query:
-- select id, email from auth.users order by created_at asc;

do $$
declare
  v_owner_id uuid;
  v_clinic_id uuid;
  v_month_start date;
  v_day integer;
  v_slot integer;
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_status public.appointment_status;
  v_patient_id uuid;
  v_chair_id uuid;
  v_appointment_id uuid;
  v_invoice_id uuid;
  v_proc_id uuid;
  v_proc_price numeric(10,2);
  v_proc_count integer;
  v_subtotal numeric(10,2);
  v_discount numeric(10,2);
  v_total numeric(10,2);
  v_invoice_status public.invoice_status;
  v_payment_method public.payment_method;
begin
  select id
  into v_owner_id
  from auth.users
  where email = 'finezza@gmail.com'
  limit 1;

  if v_owner_id is null then
    raise exception 'User finezza@gmail.com not found in auth.users';
  end if;

  insert into public.clinics (name, slug, owner_id)
  values ('Finezza RB', 'finezza-rb', v_owner_id)
  on conflict (slug) do update
  set name = excluded.name,
      owner_id = excluded.owner_id,
      updated_at = now()
  returning id into v_clinic_id;

  insert into public.clinic_members (clinic_id, user_id, role, status)
  values (v_clinic_id, v_owner_id, 'owner', 'active')
  on conflict (clinic_id, user_id) do update
  set role = 'owner',
      status = 'active',
      updated_at = now();

  delete from public.payments where clinic_id = v_clinic_id;
  delete from public.invoices where clinic_id = v_clinic_id;
  delete from public.appointment_procedures where clinic_id = v_clinic_id;
  delete from public.appointments where clinic_id = v_clinic_id;
  delete from public.procedures where clinic_id = v_clinic_id;
  delete from public.patients where clinic_id = v_clinic_id;
  delete from public.chairs where clinic_id = v_clinic_id;
  delete from public.notifications where clinic_id = v_clinic_id;
  delete from public.inventory_movements where clinic_id = v_clinic_id;
  delete from public.inventory_items where clinic_id = v_clinic_id;

  insert into public.chairs (clinic_id, name, status)
  values
    (v_clinic_id, 'Sala 01', 'available'),
    (v_clinic_id, 'Sala 02', 'available'),
    (v_clinic_id, 'Sala 03', 'available'),
    (v_clinic_id, 'Sala 04', 'maintenance')
  on conflict (clinic_id, name) do update
  set status = excluded.status,
      updated_at = now();

  insert into public.procedures (clinic_id, name, category, price_base, duration_min)
  values
    (v_clinic_id, 'Lentes de contato', 'estetica', 2800.00, 90),
    (v_clinic_id, 'Clareamento', 'estetica', 1200.00, 60),
    (v_clinic_id, 'Implante unitario', 'cirurgia', 4500.00, 120),
    (v_clinic_id, 'Orto fixa', 'ortodontia', 2200.00, 90),
    (v_clinic_id, 'Alinhadores', 'ortodontia', 3200.00, 60),
    (v_clinic_id, 'Restauracao premium', 'clinica', 480.00, 45),
    (v_clinic_id, 'Profilaxia', 'preventivo', 220.00, 30),
    (v_clinic_id, 'Consulta estetica', 'estetica', 350.00, 45)
  on conflict (clinic_id, name) do update
  set category = excluded.category,
      price_base = excluded.price_base,
      duration_min = excluded.duration_min,
      updated_at = now();

  insert into public.patients (
    clinic_id,
    full_name,
    email,
    phone,
    birth_date,
    gender,
    notes
  )
  values
    (v_clinic_id, 'Ana Costa', 'ana.costa@mail.com', '11 98888-1001', '1989-02-14', 'female', 'Paciente premium'),
    (v_clinic_id, 'Bruno Lima', 'bruno.lima@mail.com', '11 98888-1002', '1985-07-22', 'male', 'Retorno mensal'),
    (v_clinic_id, 'Carla Souza', 'carla.souza@mail.com', '11 98888-1003', '1992-11-05', 'female', 'Clareamento agendado'),
    (v_clinic_id, 'Diego Martins', 'diego.martins@mail.com', '11 98888-1004', '1980-03-18', 'male', 'Implante em andamento'),
    (v_clinic_id, 'Eduarda Rocha', 'eduarda.rocha@mail.com', '11 98888-1005', '1996-09-30', 'female', 'Alinhadores'),
    (v_clinic_id, 'Fernando Alves', 'fernando.alves@mail.com', '11 98888-1006', '1978-12-10', 'male', 'Manutencao semestral'),
    (v_clinic_id, 'Gabriela Ramos', 'gabriela.ramos@mail.com', '11 98888-1007', '1991-06-03', 'female', 'Lentes em avaliacao'),
    (v_clinic_id, 'Henrique Oliveira', 'henrique.oliveira@mail.com', '11 98888-1008', '1987-05-12', 'male', 'Consulta estetica'),
    (v_clinic_id, 'Isabela Silva', 'isabela.silva@mail.com', '11 98888-1009', '1994-01-25', 'female', 'Retorno orto'),
    (v_clinic_id, 'Joao Ferreira', 'joao.ferreira@mail.com', '11 98888-1010', '1983-08-19', 'male', 'Acompanhamento'),
    (v_clinic_id, 'Karen Dias', 'karen.dias@mail.com', '11 98888-1011', '1990-04-08', 'female', 'Profilaxia'),
    (v_clinic_id, 'Lucas Mendes', 'lucas.mendes@mail.com', '11 98888-1012', '1986-10-17', 'male', 'Restauracao'),
    (v_clinic_id, 'Mariana Costa', 'mariana.costa@mail.com', '11 98888-1013', '1993-02-09', 'female', 'Lentes aprovadas'),
    (v_clinic_id, 'Nicolas Santos', 'nicolas.santos@mail.com', '11 98888-1014', '1981-03-29', 'male', 'Reavaliacao'),
    (v_clinic_id, 'Patricia Araujo', 'patricia.araujo@mail.com', '11 98888-1015', '1988-07-14', 'female', 'Clareamento'),
    (v_clinic_id, 'Rafael Moreira', 'rafael.moreira@mail.com', '11 98888-1016', '1992-12-21', 'male', 'Implante'),
    (v_clinic_id, 'Sofia Lima', 'sofia.lima@mail.com', '11 98888-1017', '1997-05-05', 'female', 'Avaliacao inicial'),
    (v_clinic_id, 'Thiago Pereira', 'thiago.pereira@mail.com', '11 98888-1018', '1984-09-11', 'male', 'Orto fixa'),
    (v_clinic_id, 'Vanessa Ribeiro', 'vanessa.ribeiro@mail.com', '11 98888-1019', '1991-11-27', 'female', 'Consulta premium'),
    (v_clinic_id, 'Wagner Costa', 'wagner.costa@mail.com', '11 98888-1020', '1982-06-16', 'male', 'Revisao'),
    (v_clinic_id, 'Yasmin Nogueira', 'yasmin.nogueira@mail.com', '11 98888-1021', '1995-04-23', 'female', 'Alinhadores'),
    (v_clinic_id, 'Caio Rocha', 'caio.rocha@mail.com', '11 98888-1022', '1989-01-31', 'male', 'Implante final'),
    (v_clinic_id, 'Luiza Faria', 'luiza.faria@mail.com', '11 98888-1023', '1996-08-07', 'female', 'Limpeza premium'),
    (v_clinic_id, 'Marco Teixeira', 'marco.teixeira@mail.com', '11 98888-1024', '1985-02-26', 'male', 'Retorno anual');

  for v_month_offset in 0..11 loop
    v_month_start := (date_trunc('month', now())::date - ((11 - v_month_offset) * interval '1 month'));
    for v_day in 0..3 loop
      for v_slot in 0..2 loop
        v_start_at := (v_month_start + (v_day * interval '7 days') + time '09:00' + (v_slot * interval '2 hours'))::timestamptz;
        v_end_at := v_start_at + interval '1 hour';

        if random() < 0.08 then
          v_status := 'no_show';
        elsif random() < 0.16 then
          v_status := 'cancelled';
        elsif random() < 0.42 then
          v_status := 'confirmed';
        else
          v_status := 'completed';
        end if;

        select id into v_patient_id
        from public.patients
        where clinic_id = v_clinic_id
        order by random()
        limit 1;

        select id into v_chair_id
        from public.chairs
        where clinic_id = v_clinic_id
        order by random()
        limit 1;

        insert into public.appointments (
          clinic_id,
          patient_id,
          chair_id,
          start_at,
          end_at,
          status,
          source,
          notes,
          created_by
        )
        values (
          v_clinic_id,
          v_patient_id,
          v_chair_id,
          v_start_at,
          v_end_at,
          v_status,
          'manual',
          null,
          v_owner_id
        )
        returning id into v_appointment_id;

        v_proc_count := case when random() < 0.3 then 2 else 1 end;
        for v_proc_index in 1..v_proc_count loop
          select id, price_base
          into v_proc_id, v_proc_price
          from public.procedures
          where clinic_id = v_clinic_id
          order by random()
          limit 1;

          insert into public.appointment_procedures (
            clinic_id,
            appointment_id,
            procedure_id,
            quantity,
            unit_price
          )
          values (
            v_clinic_id,
            v_appointment_id,
            v_proc_id,
            1,
            v_proc_price
          );
        end loop;

        if v_status in ('completed', 'confirmed') then
          select coalesce(sum(total), 0)
          into v_subtotal
          from public.appointment_procedures
          where appointment_id = v_appointment_id;

          v_discount := case
            when random() < 0.12 then round(v_subtotal * 0.05, 2)
            else 0
          end;

          v_total := v_subtotal - v_discount;

          if v_status = 'completed' and random() < 0.75 then
            v_invoice_status := 'paid';
          else
            v_invoice_status := 'issued';
          end if;

          insert into public.invoices (
            clinic_id,
            patient_id,
            appointment_id,
            status,
            subtotal,
            discount,
            total,
            issued_at,
            due_at
          )
          values (
            v_clinic_id,
            v_patient_id,
            v_appointment_id,
            v_invoice_status,
            v_subtotal,
            v_discount,
            v_total,
            v_end_at,
            (v_end_at::date + 7)
          )
          returning id into v_invoice_id;

          if v_invoice_status = 'paid' then
            v_payment_method := case
              when random() < 0.45 then 'card'
              when random() < 0.70 then 'pix'
              when random() < 0.85 then 'cash'
              else 'bank_transfer'
            end;

            insert into public.payments (
              clinic_id,
              invoice_id,
              amount,
              method,
              paid_at
            )
            values (
              v_clinic_id,
              v_invoice_id,
              v_total,
              v_payment_method,
              v_end_at + interval '2 hours'
            );
          end if;
        end if;
      end loop;
    end loop;
  end loop;

  for v_future_index in 1..6 loop
    v_start_at := (date_trunc('day', now()) + (v_future_index * interval '1 day') + time '10:00')::timestamptz;
    v_end_at := v_start_at + interval '1 hour';
    v_status := case when random() < 0.5 then 'scheduled' else 'confirmed' end;

    select id into v_patient_id
    from public.patients
    where clinic_id = v_clinic_id
    order by random()
    limit 1;

    select id into v_chair_id
    from public.chairs
    where clinic_id = v_clinic_id
    order by random()
    limit 1;

    insert into public.appointments (
      clinic_id,
      patient_id,
      chair_id,
      start_at,
      end_at,
      status,
      source,
      notes,
      created_by
    )
    values (
      v_clinic_id,
      v_patient_id,
      v_chair_id,
      v_start_at,
      v_end_at,
      v_status,
      'manual',
      'Follow up',
      v_owner_id
    )
    returning id into v_appointment_id;

    select id, price_base
    into v_proc_id, v_proc_price
    from public.procedures
    where clinic_id = v_clinic_id
    order by random()
    limit 1;

    insert into public.appointment_procedures (
      clinic_id,
      appointment_id,
      procedure_id,
      quantity,
      unit_price
    )
    values (
      v_clinic_id,
      v_appointment_id,
      v_proc_id,
      1,
      v_proc_price
    );
  end loop;
end $$;
