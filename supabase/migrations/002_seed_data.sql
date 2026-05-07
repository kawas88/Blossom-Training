-- =====================================================================
-- Nursery Trainer Hub - Seed Data
-- =====================================================================
-- Run this AFTER 001_initial_schema.sql.
--
-- IMPORTANT: Replace the password_hash placeholder below before running.
-- Generate one with:
--   node -e "require('bcryptjs').hash('your-password-here', 10).then(console.log)"
-- =====================================================================

-- ---------------------------------------------------------------------
-- Admin user
-- ---------------------------------------------------------------------
insert into admin_users (email, password_hash, name, role)
values (
  'kawas@swiftap.studio',
  -- REPLACE THIS placeholder with the bcrypt hash you generated.
  '$2a$10$Hglgw30uaYI2V./g.SfZT.a1wjMiOfajAw3JaxlPS4G4hrCTTUTvq',
  'Kawas',
  'admin'
)
on conflict (email) do nothing;

-- ---------------------------------------------------------------------
-- Icebreaker: "Match the milestone to the age group"
-- ---------------------------------------------------------------------
do $$
declare
  v_ice_id uuid;
  c_0_6   uuid; c_6_12  uuid; c_12_18 uuid; c_18_24 uuid;
  c_24_30 uuid; c_30_36 uuid; c_36_42 uuid; c_42_48 uuid;
begin
  insert into icebreakers (title, format, instructions, show_live_wall)
  values (
    'Match the milestone to the age group',
    'matching',
    'Drag each milestone card into the age group you think it belongs to. Green means correct. Red means try again — move it to a different age group. Each milestone has a coloured dot showing its developmental domain. This is not a test — it is a warm-up to get everyone thinking about child development.',
    true
  )
  returning id into v_ice_id;

  insert into icebreaker_categories (icebreaker_id, label, position) values
    (v_ice_id, '0–6 months',   0) returning id into c_0_6;
  insert into icebreaker_categories (icebreaker_id, label, position) values
    (v_ice_id, '6–12 months',  1) returning id into c_6_12;
  insert into icebreaker_categories (icebreaker_id, label, position) values
    (v_ice_id, '12–18 months', 2) returning id into c_12_18;
  insert into icebreaker_categories (icebreaker_id, label, position) values
    (v_ice_id, '18–24 months', 3) returning id into c_18_24;
  insert into icebreaker_categories (icebreaker_id, label, position) values
    (v_ice_id, '24–30 months', 4) returning id into c_24_30;
  insert into icebreaker_categories (icebreaker_id, label, position) values
    (v_ice_id, '30–36 months', 5) returning id into c_30_36;
  insert into icebreaker_categories (icebreaker_id, label, position) values
    (v_ice_id, '36–42 months', 6) returning id into c_36_42;
  insert into icebreaker_categories (icebreaker_id, label, position) values
    (v_ice_id, '42–48 months', 7) returning id into c_42_48;

  insert into icebreaker_items (icebreaker_id, text, correct_category_id, tag_label, tag_color, position) values
    -- 0-6
    (v_ice_id, 'Turns head toward sounds or voices', c_0_6, 'Communication', '#3B82F6', 0),
    (v_ice_id, 'Rolls from tummy to back', c_0_6, 'Gross Motor', '#10B981', 1),
    -- 6-12
    (v_ice_id, 'Babbles with consonant sounds like "ba-ba" or "da-da"', c_6_12, 'Communication', '#3B82F6', 2),
    (v_ice_id, 'Picks up small objects using thumb and finger (pincer grasp)', c_6_12, 'Fine Motor', '#F59E0B', 3),
    (v_ice_id, 'Plays peek-a-boo and responds with smiles', c_6_12, 'Personal-Social', '#FB7185', 4),
    -- 12-18
    (v_ice_id, 'Says 1–2 meaningful words like "mama" or "ball"', c_12_18, 'Communication', '#3B82F6', 5),
    (v_ice_id, 'Walks independently', c_12_18, 'Gross Motor', '#10B981', 6),
    (v_ice_id, 'Drops small objects into a container', c_12_18, 'Fine Motor', '#F59E0B', 7),
    -- 18-24
    (v_ice_id, 'Uses 2-word phrases like "want milk" or "go outside"', c_18_24, 'Communication', '#3B82F6', 8),
    (v_ice_id, 'Kicks a ball forward', c_18_24, 'Gross Motor', '#10B981', 9),
    (v_ice_id, 'Stacks 4–6 blocks into a tower', c_18_24, 'Fine Motor', '#F59E0B', 10),
    -- 24-30
    (v_ice_id, 'Follows 2-step instructions like "get your shoes and bring them to me"', c_24_30, 'Communication', '#3B82F6', 11),
    (v_ice_id, 'Jumps with both feet off the ground', c_24_30, 'Gross Motor', '#10B981', 12),
    (v_ice_id, 'Takes turns with help during simple games', c_24_30, 'Personal-Social', '#FB7185', 13),
    -- 30-36
    (v_ice_id, 'Speaks in 3–4 word sentences and names familiar objects', c_30_36, 'Communication', '#3B82F6', 14),
    (v_ice_id, 'Copies a circle after being shown', c_30_36, 'Fine Motor', '#F59E0B', 15),
    (v_ice_id, 'Feeds self with a spoon with minimal spilling', c_30_36, 'Personal-Social', '#FB7185', 16),
    -- 36-42
    (v_ice_id, 'Asks "why" and "how" questions', c_36_42, 'Communication', '#3B82F6', 17),
    (v_ice_id, 'Climbs stairs using alternating feet', c_36_42, 'Gross Motor', '#10B981', 18),
    -- 42-48
    (v_ice_id, 'Completes simple 3–4 piece puzzles and sorts by shape and colour', c_42_48, 'Problem Solving', '#8B5CF6', 19);
end $$;

-- ---------------------------------------------------------------------
-- Survey: "ASQ-3 Post-Training Feedback"
-- ---------------------------------------------------------------------
do $$
declare
  v_survey_id uuid;
begin
  insert into surveys (title, description)
  values (
    'ASQ-3 Post-Training Feedback',
    'Help us understand how the ASQ-3 has supported your work this year. Your answers are anonymous unless you choose to add your name.'
  )
  returning id into v_survey_id;

  insert into survey_questions (survey_id, question, question_type, required, position) values
    (v_survey_id, 'Has the ASQ-3 helped you understand your children in class better?', 'yes_no_notreally', true, 0),
    (v_survey_id, 'Do you feel more confident identifying developmental strengths and concerns?', 'yes_no', true, 1),
    (v_survey_id, 'Did the ASQ-3 tracker help you to stay organized and consistent with support strategies?', 'yes_no', true, 2),
    (v_survey_id, 'Did the ASQ-3 results change the way you plan activities for individual children?', 'yes_no_sometimes', true, 3),
    (v_survey_id, 'Has the ASQ-3 helped you have more informed conversations with parents?', 'yes_no_notreally', true, 4),
    (v_survey_id, 'Would you say that the ASQ-3 made a meaningful difference to your class this year?', 'yes_no', true, 5),
    (v_survey_id, 'What is the one thing that you would change about how we use the ASQ-3 at our nurseries?', 'long_text', false, 6);
end $$;

-- ---------------------------------------------------------------------
-- Demo training
-- ---------------------------------------------------------------------
do $$
declare
  v_ice_id uuid;
  v_survey_id uuid;
begin
  select id into v_ice_id from icebreakers where title = 'Match the milestone to the age group' limit 1;
  select id into v_survey_id from surveys where title = 'ASQ-3 Post-Training Feedback' limit 1;

  insert into trainings (title, nursery_name, trainer_name, description, join_code, slug, status, icebreaker_id, survey_id)
  values (
    'ASQ-3 Annual Reflection',
    'Sample Nursery',
    'Kawas',
    'A demo training for the ASQ-3 post-year reflection and feedback session.',
    'ASQ-DEMO',
    'asq-demo',
    'live',
    v_ice_id,
    v_survey_id
  )
  on conflict (join_code) do nothing;
end $$;
