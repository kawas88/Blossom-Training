-- =====================================================================
-- Trainzy — extend the ASQ-DEMO training with Phase 3A/3B/3C exercises
-- =====================================================================
-- Adds three new exercises to the demo so prospects see the breadth of
-- types after migration 008. Skips Quiz (existing types cover that
-- ground), Annotation (would need a hosted image), and Image Annotation.
-- Trainer can add those via the admin UI.
-- =====================================================================

do $$
declare
  v_workspace_id uuid;
  v_training_id uuid;
  v_reflection_id uuid;
  v_word_cloud_id uuid;
  v_scenario_id uuid;
  v_next_position int;
  v_node_start uuid := uuid_generate_v4();
  v_node_choice uuid := uuid_generate_v4();
  v_node_end_positive uuid := uuid_generate_v4();
  v_node_end_negative uuid := uuid_generate_v4();
begin
  select id into v_workspace_id from workspaces where slug = 'demo' limit 1;
  select id into v_training_id from trainings where join_code = 'ASQ-DEMO' limit 1;
  if v_workspace_id is null or v_training_id is null then
    raise notice 'Demo workspace or ASQ-DEMO training missing — skipping demo extension';
    return;
  end if;

  select coalesce(max(position), -1) + 1 into v_next_position
    from training_exercises where training_id = v_training_id;

  -- ---------------------------------------------------------------------
  -- Reflection: open-ended take-away
  -- ---------------------------------------------------------------------
  if not exists (
    select 1 from exercises
    where workspace_id = v_workspace_id
      and type = 'reflection'
      and title = 'One thing that stayed with you'
  ) then
    insert into exercises (workspace_id, type, title, description, config)
    values (
      v_workspace_id,
      'reflection',
      'One thing that stayed with you',
      'A short take-away from today.',
      jsonb_build_object(
        'prompt', 'What is one thing from today''s ASQ-3 conversation that you''ll take back to your classroom on Monday?',
        'minLength', 20,
        'aiAnalysis', true
      )
    )
    returning id into v_reflection_id;

    insert into training_exercises (training_id, exercise_id, position, required, pacing)
    values (v_training_id, v_reflection_id, v_next_position, false, 'self')
    on conflict (training_id, exercise_id) do nothing;
    v_next_position := v_next_position + 1;
  end if;

  -- ---------------------------------------------------------------------
  -- Word Cloud: trainer-paced "one word to describe today"
  -- ---------------------------------------------------------------------
  if not exists (
    select 1 from exercises
    where workspace_id = v_workspace_id
      and type = 'word_cloud'
      and title = 'In a few words'
  ) then
    insert into exercises (workspace_id, type, title, description, config)
    values (
      v_workspace_id,
      'word_cloud',
      'In a few words',
      'Build the room''s shared cloud.',
      jsonb_build_object(
        'prompt', 'What''s one word that captures how you feel about your year with the ASQ-3?',
        'maxLength', 30,
        'allowMultiple', true,
        'maxWordsPerParticipant', 3,
        'caseSensitive', false,
        'stopWords', jsonb_build_array('the','and','a','an','to','of','in')
      )
    )
    returning id into v_word_cloud_id;

    insert into training_exercises (training_id, exercise_id, position, required, pacing)
    values (v_training_id, v_word_cloud_id, v_next_position, false, 'trainer')
    on conflict (training_id, exercise_id) do nothing;
    v_next_position := v_next_position + 1;
  end if;

  -- ---------------------------------------------------------------------
  -- Branching Scenario: a tiny ethics moment
  -- ---------------------------------------------------------------------
  if not exists (
    select 1 from exercises
    where workspace_id = v_workspace_id
      and type = 'scenario'
      and title = 'A moment in the classroom'
  ) then
    insert into exercises (workspace_id, type, title, description, config)
    values (
      v_workspace_id,
      'scenario',
      'A moment in the classroom',
      'A short branching moment with a parent.',
      jsonb_build_object(
        'startNodeId', v_node_start::text,
        'nodes', jsonb_build_array(
          jsonb_build_object(
            'id', v_node_start::text,
            'type', 'narrative',
            'content', 'A parent stops you at pickup and asks why their 30-month-old isn''t talking in 3–4 word sentences yet — your last ASQ-3 flagged the Communication domain.',
            'choices', jsonb_build_array(
              jsonb_build_object('label', 'Continue', 'nextNodeId', v_node_choice::text)
            )
          ),
          jsonb_build_object(
            'id', v_node_choice::text,
            'type', 'choice',
            'content', 'What do you say first?',
            'choices', jsonb_build_array(
              jsonb_build_object(
                'label', 'Share what you''ve noticed in class and ask about her experience at home.',
                'nextNodeId', v_node_end_positive::text
              ),
              jsonb_build_object(
                'label', 'Tell her she shouldn''t worry, every child develops at their own pace.',
                'nextNodeId', v_node_end_negative::text
              )
            )
          ),
          jsonb_build_object(
            'id', v_node_end_positive::text,
            'type', 'ending',
            'content', 'You open a real conversation. The parent feels heard, and you agree to compare notes in two weeks. The ASQ-3 becomes a shared lens, not a verdict.',
            'outcome', 'positive'
          ),
          jsonb_build_object(
            'id', v_node_end_negative::text,
            'type', 'ending',
            'content', 'The parent leaves feeling brushed off. Two weeks later, you find out she''s sought a second opinion privately — and is wondering why you didn''t bring this up sooner.',
            'outcome', 'negative'
          )
        )
      )
    )
    returning id into v_scenario_id;

    insert into training_exercises (training_id, exercise_id, position, required, pacing)
    values (v_training_id, v_scenario_id, v_next_position, false, 'self')
    on conflict (training_id, exercise_id) do nothing;
    v_next_position := v_next_position + 1;
  end if;
end $$;
