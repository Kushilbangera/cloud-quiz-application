-- QuizCloud demo learning paths and sample quizzes.
-- Run supabase-schema.sql first.

-- =========================
-- STREAMS
-- =========================
insert into public.streams (education_level_id, name, description)
select id, 'Class 6-10', 'School curriculum'
from public.education_levels where name = 'Higher School'
on conflict (education_level_id, name) do nothing;

insert into public.streams (education_level_id, name, description)
select id, 'PCMB', 'Physics, Chemistry, Mathematics and Biology'
from public.education_levels where name = 'PUC / Higher Secondary'
on conflict (education_level_id, name) do nothing;

insert into public.streams (education_level_id, name, description)
select id, 'Engineering', 'Engineering undergraduate stream'
from public.education_levels where name = 'UG'
on conflict (education_level_id, name) do nothing;

insert into public.streams (education_level_id, name, description)
select id, 'Computer Applications', 'Computer application and software subjects'
from public.education_levels where name = 'UG'
on conflict (education_level_id, name) do nothing;

-- =========================
-- CLASS 6-10 SUBJECTS
-- =========================
insert into public.subjects (stream_id, name) select s.id,'Mathematics' from public.streams s join public.education_levels e on e.id=s.education_level_id where e.name='Higher School' and s.name='Class 6-10' on conflict (stream_id,name) do nothing;
insert into public.subjects (stream_id, name) select s.id,'Science' from public.streams s join public.education_levels e on e.id=s.education_level_id where e.name='Higher School' and s.name='Class 6-10' on conflict (stream_id,name) do nothing;
insert into public.subjects (stream_id, name) select s.id,'English' from public.streams s join public.education_levels e on e.id=s.education_level_id where e.name='Higher School' and s.name='Class 6-10' on conflict (stream_id,name) do nothing;

insert into public.topics (subject_id,name) select sub.id,x.name from public.subjects sub join public.streams s on s.id=sub.stream_id join public.education_levels e on e.id=s.education_level_id cross join (values ('Algebra'),('Geometry'),('Arithmetic'),('Mensuration'),('Statistics'),('Trigonometry')) x(name) where e.name='Higher School' and s.name='Class 6-10' and sub.name='Mathematics' on conflict (subject_id,name) do nothing;
insert into public.topics (subject_id,name) select sub.id,x.name from public.subjects sub join public.streams s on s.id=sub.stream_id join public.education_levels e on e.id=s.education_level_id cross join (values ('Motion'),('Laws of Motion'),('Work Energy Power'),('Thermodynamics'),('Waves'),('Electricity'),('Magnetism')) x(name) where e.name='Higher School' and s.name='Class 6-10' and sub.name='Science' on conflict (subject_id,name) do nothing;
insert into public.topics (subject_id,name) select sub.id,x.name from public.subjects sub join public.streams s on s.id=sub.stream_id join public.education_levels e on e.id=s.education_level_id cross join (values ('Grammar'),('Vocabulary'),('Reading Comprehension'),('Writing')) x(name) where e.name='Higher School' and s.name='Class 6-10' and sub.name='English' on conflict (subject_id,name) do nothing;

-- =========================
-- PCMB SUBJECTS
-- =========================
insert into public.subjects (stream_id,name) select s.id,x.name from public.streams s join public.education_levels e on e.id=s.education_level_id cross join (values ('Physics'),('Chemistry'),('Mathematics'),('Biology')) x(name) where e.name='PUC / Higher Secondary' and s.name='PCMB' on conflict (stream_id,name) do nothing;
insert into public.topics (subject_id,name) select sub.id,x.name from public.subjects sub join public.streams s on s.id=sub.stream_id join public.education_levels e on e.id=s.education_level_id cross join (values ('Motion'),('Laws of Motion'),('Work Energy Power'),('Thermodynamics'),('Waves'),('Electricity'),('Magnetism')) x(name) where e.name='PUC / Higher Secondary' and s.name='PCMB' and sub.name='Physics' on conflict (subject_id,name) do nothing;
insert into public.topics (subject_id,name) select sub.id,x.name from public.subjects sub join public.streams s on s.id=sub.stream_id join public.education_levels e on e.id=s.education_level_id cross join (values ('Atomic Structure'),('Chemical Bonding'),('Thermodynamics'),('Organic Chemistry'),('Equilibrium')) x(name) where e.name='PUC / Higher Secondary' and s.name='PCMB' and sub.name='Chemistry' on conflict (subject_id,name) do nothing;
insert into public.topics (subject_id,name) select sub.id,x.name from public.subjects sub join public.streams s on s.id=sub.stream_id join public.education_levels e on e.id=s.education_level_id cross join (values ('Algebra'),('Calculus'),('Trigonometry'),('Probability'),('Statistics')) x(name) where e.name='PUC / Higher Secondary' and s.name='PCMB' and sub.name='Mathematics' on conflict (subject_id,name) do nothing;
insert into public.topics (subject_id,name) select sub.id,x.name from public.subjects sub join public.streams s on s.id=sub.stream_id join public.education_levels e on e.id=s.education_level_id cross join (values ('Cell Biology'),('Genetics'),('Human Physiology'),('Ecology'),('Plant Biology')) x(name) where e.name='PUC / Higher Secondary' and s.name='PCMB' and sub.name='Biology' on conflict (subject_id,name) do nothing;

-- =========================
-- UG ENGINEERING / COMPUTER APPLICATIONS
-- =========================
insert into public.subjects (stream_id,name) select s.id,x.name from public.streams s join public.education_levels e on e.id=s.education_level_id cross join (values ('Computer Science'),('Electronics'),('Mechanical Engineering')) x(name) where e.name='UG' and s.name='Engineering' on conflict (stream_id,name) do nothing;
insert into public.topics (subject_id,name) select sub.id,x.name from public.subjects sub join public.streams s on s.id=sub.stream_id join public.education_levels e on e.id=s.education_level_id cross join (values ('Programming Fundamentals'),('Data Structures'),('Algorithms'),('Operating Systems'),('Database Systems')) x(name) where e.name='UG' and s.name='Engineering' and sub.name='Computer Science' on conflict (subject_id,name) do nothing;
insert into public.subjects (stream_id,name) select s.id,x.name from public.streams s join public.education_levels e on e.id=s.education_level_id cross join (values ('Advanced Programming'),('Web Development'),('Cloud Computing'),('Artificial Intelligence')) x(name) where e.name='UG' and s.name='Computer Applications' on conflict (stream_id,name) do nothing;
insert into public.topics (subject_id,name) select sub.id,x.name from public.subjects sub join public.streams s on s.id=sub.stream_id join public.education_levels e on e.id=s.education_level_id cross join (values ('Advanced Java'),('Python'),('Design Patterns'),('Advanced OOP'),('Software Architecture')) x(name) where e.name='UG' and s.name='Computer Applications' and sub.name='Advanced Programming' on conflict (subject_id,name) do nothing;
insert into public.topics (subject_id,name) select sub.id,x.name from public.subjects sub join public.streams s on s.id=sub.stream_id join public.education_levels e on e.id=s.education_level_id cross join (values ('HTML CSS'),('JavaScript'),('REST APIs'),('Frontend Development'),('Backend Development')) x(name) where e.name='UG' and s.name='Computer Applications' and sub.name='Web Development' on conflict (subject_id,name) do nothing;
insert into public.topics (subject_id,name) select sub.id,x.name from public.subjects sub join public.streams s on s.id=sub.stream_id join public.education_levels e on e.id=s.education_level_id cross join (values ('Cloud Basics'),('AWS'),('Docker'),('CI CD'),('Cloud Security')) x(name) where e.name='UG' and s.name='Computer Applications' and sub.name='Cloud Computing' on conflict (subject_id,name) do nothing;
insert into public.topics (subject_id,name) select sub.id,x.name from public.subjects sub join public.streams s on s.id=sub.stream_id join public.education_levels e on e.id=s.education_level_id cross join (values ('Machine Learning'),('Neural Networks'),('NLP'),('Computer Vision'),('Generative AI')) x(name) where e.name='UG' and s.name='Computer Applications' and sub.name='Artificial Intelligence' on conflict (subject_id,name) do nothing;

-- =========================
-- ONE READY-TO-DEMO QUIZ
-- Programming Fundamentals
-- =========================
insert into public.quizzes (title,description,category,difficulty,time_limit,subject_id,topic_id,access_type,published,total_questions)
select 'Programming Fundamentals Quiz','Core programming concepts for beginners.','Programming','Easy',10,sub.id,t.id,'free',true,5
from public.subjects sub join public.streams s on s.id=sub.stream_id join public.education_levels e on e.id=s.education_level_id
join public.topics t on t.subject_id=sub.id
where e.name='UG' and s.name='Engineering' and sub.name='Computer Science' and t.name='Programming Fundamentals'
and not exists (select 1 from public.quizzes q where q.title='Programming Fundamentals Quiz');

insert into public.questions (quiz_id,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,marks,negative_marks)
select q.id, v.question_text,v.a,v.b,v.c,v.d,v.answer,v.explanation,1,0
from public.quizzes q
cross join (values
('Which keyword defines a function in Python?','func','def','function','define','B','Python uses the def keyword to define functions.'),
('Which data type stores True or False?','String','Integer','Boolean','List','C','Boolean values represent True or False.'),
('Which symbol is used for equality comparison in Python?','=','==','===','!=','B','The == operator compares two values for equality.'),
('What is the output type of 2 + 3 in Python?','String','Integer','Boolean','List','B','Adding two integers produces an integer.'),
('Which structure stores an ordered collection of items in Python?','List','Class','Module','Exception','A','A Python list stores an ordered collection of items.')
) v(question_text,a,b,c,d,answer,explanation)
where q.title='Programming Fundamentals Quiz'
and not exists (select 1 from public.questions x where x.quiz_id=q.id);

update public.quizzes q set total_questions=(select count(*) from public.questions x where x.quiz_id=q.id) where q.title='Programming Fundamentals Quiz';

-- =========================
-- READY-TO-DEMO QUIZ: PHYSICS MOTION
-- =========================
insert into public.quizzes (title,description,category,difficulty,time_limit,subject_id,topic_id,access_type,published,total_questions)
select 'Physics - Motion','Test your understanding of motion and kinematics.','Physics','Medium',10,sub.id,t.id,'free',true,5
from public.subjects sub join public.streams s on s.id=sub.stream_id join public.education_levels e on e.id=s.education_level_id join public.topics t on t.subject_id=sub.id
where e.name='PUC / Higher Secondary' and s.name='PCMB' and sub.name='Physics' and t.name='Motion'
and not exists (select 1 from public.quizzes q where q.title='Physics - Motion');

insert into public.questions (quiz_id,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,marks,negative_marks)
select q.id,v.question_text,v.a,v.b,v.c,v.d,v.answer,v.explanation,1,0
from public.quizzes q cross join (values
('What is the SI unit of velocity?','m/s','m/s²','km','N','A','Velocity is measured in metres per second.'),
('Acceleration is the rate of change of what?','Distance','Velocity','Mass','Force','B','Acceleration is the rate of change of velocity.'),
('A body at rest has what velocity?','1 m/s','-1 m/s','0 m/s','10 m/s','C','An object at rest has zero velocity.'),
('Which quantity has both magnitude and direction?','Speed','Distance','Time','Velocity','D','Velocity is a vector quantity.'),
('The slope of a distance-time graph represents what?','Speed','Mass','Force','Energy','A','The slope of a distance-time graph gives speed.')
) v(question_text,a,b,c,d,answer,explanation)
where q.title='Physics - Motion'
and not exists (select 1 from public.questions x where x.quiz_id=q.id);
update public.quizzes q set total_questions=(select count(*) from public.questions x where x.quiz_id=q.id) where q.title='Physics - Motion';

-- =========================
-- READY-TO-DEMO QUIZ: ALGEBRA
-- =========================
insert into public.quizzes (title,description,category,difficulty,time_limit,subject_id,topic_id,access_type,published,total_questions)
select 'Algebra Challenge','Practice equations, expressions and basic algebra.','Mathematics','Easy',10,sub.id,t.id,'free',true,5
from public.subjects sub join public.streams s on s.id=sub.stream_id join public.education_levels e on e.id=s.education_level_id join public.topics t on t.subject_id=sub.id
where e.name='Higher School' and s.name='Class 6-10' and sub.name='Mathematics' and t.name='Algebra'
and not exists (select 1 from public.quizzes q where q.title='Algebra Challenge');

insert into public.questions (quiz_id,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,marks,negative_marks)
select q.id,v.question_text,v.a,v.b,v.c,v.d,v.answer,v.explanation,1,0
from public.quizzes q cross join (values
('What is x + 5 = 9?','2','3','4','5','C','Subtract 5 from both sides to get x = 4.'),
('Simplify 2x + 3x.','5','5x','6x','x5','B','Like terms add to 5x.'),
('What is the value of 3²?','6','8','9','12','C','3 × 3 = 9.'),
('If x = 2, what is 4x + 1?','7','8','9','10','C','4(2) + 1 = 9.'),
('Which is a linear equation?','x² = 4','2x + 3 = 7','xy = 5','x³ = 8','B','A linear equation has the variable only to the first power.')
) v(question_text,a,b,c,d,answer,explanation)
where q.title='Algebra Challenge'
and not exists (select 1 from public.questions x where x.quiz_id=q.id);
update public.quizzes q set total_questions=(select count(*) from public.questions x where x.quiz_id=q.id) where q.title='Algebra Challenge';
