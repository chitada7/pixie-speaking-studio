/* Pixie Speaking Studio — built-in content */
window.PSS_DATA = {
  categories: [
    { id: 'hotel', ko: '호텔', icon: '🏨' },
    { id: 'clinic', ko: '병원·약국', icon: '💊' },
    { id: 'cafe', ko: '카페', icon: '☕' },
    { id: 'restaurant', ko: '식당', icon: '🍽' },
    { id: 'shopping', ko: '쇼핑', icon: '🛍' },
    { id: 'airport', ko: '공항', icon: '✈️' },
    { id: 'transport', ko: '교통', icon: '🚆' },
    { id: 'friends', ko: '친구 관계', icon: '🤝' },
    { id: 'exercise', ko: '운동', icon: '🏃' },
    { id: 'school', ko: '학교', icon: '🎓' },
    { id: 'home', ko: '집·생활 서비스', icon: '🔧' },
    { id: 'travel', ko: '여행·액티비티', icon: '🗺' }
  ],

  /* 기본 문제은행: AI 키가 없을 때나 AI 생성이 실패했을 때 사용 */
  seedProblems: [
    { cat: 'hotel', kind: 'general', ko: '체크인할 때, 가능하면 조용한 높은 층 방으로 배정해 줄 수 있는지 물어보세요.', role: 'hotel front desk clerk' },
    { cat: 'hotel', kind: 'tricky', ko: '밤 11시인데 옆방이 너무 시끄러워서 잠을 못 자고 있어요. 이미 한 번 프런트에 전화했는데 달라진 게 없습니다. 다시 전화해서 상황을 설명하고 해결을 요청하세요.', role: 'hotel night manager' },
    { cat: 'clinic', kind: 'general', ko: '약국에서 처방전 없이 살 수 있는 감기약 중 졸리지 않은 약이 있는지 물어보세요.', role: 'pharmacist' },
    { cat: 'clinic', kind: 'tricky', ko: '병원 예약 시간에 맞춰 왔는데 접수처에서 예약 기록이 없다고 합니다. 예약 확인 이메일이 있다고 설명하고, 오늘 진료를 받을 수 있는 방법을 물어보세요.', role: 'clinic receptionist' },
    { cat: 'cafe', kind: 'general', ko: '라테를 주문하면서 우유를 귀리우유로 바꿀 수 있는지, 추가 요금이 있는지 물어보세요.', role: 'barista' },
    { cat: 'cafe', kind: 'tricky', ko: '주문한 음료가 20분째 나오지 않고, 나보다 늦게 온 사람들이 먼저 받아 갔어요. 정중하지만 분명하게 확인을 요청하세요.', role: 'busy barista' },
    { cat: 'restaurant', kind: 'general', ko: '메뉴에 있는 요리가 많이 매운지 묻고, 덜 맵게 해 줄 수 있는지 요청하세요.', role: 'server' },
    { cat: 'restaurant', kind: 'tricky', ko: '계산서를 보니 주문하지 않은 와인 한 병이 포함되어 있어요. 이 부분을 설명하고 계산서 수정을 요청하세요.', role: 'restaurant server' },
    { cat: 'shopping', kind: 'general', ko: '마음에 드는 재킷이 있는데 한 사이즈 작은 것이 있는지, 다른 색상도 있는지 물어보세요.', role: 'shop assistant' },
    { cat: 'shopping', kind: 'tricky', ko: '3일 전에 산 신발 밑창이 벌써 떨어졌어요. 영수증은 잃어버렸지만 카드 결제 내역은 있습니다. 환불이나 교환을 요청하세요.', role: 'store manager' },
    { cat: 'airport', kind: 'general', ko: '탑승 수속을 하면서 가능하면 통로 쪽 좌석으로 바꿔 줄 수 있는지 물어보세요.', role: 'airline check-in agent' },
    { cat: 'airport', kind: 'tricky', ko: '환승 항공편이 지연되어 연결 항공편을 놓쳤어요. 오늘 안에 목적지에 도착해야 하는 상황을 설명하고 대안을 요청하세요.', role: 'airline transfer desk agent' },
    { cat: 'transport', kind: 'general', ko: '기차역 매표소에서 시내로 가는 가장 빠른 방법과 표를 어디서 사는지 물어보세요.', role: 'station staff' },
    { cat: 'transport', kind: 'tricky', ko: '택시 기사가 미터기를 켜지 않고 출발했고, 도착하니 예상보다 두 배 많은 요금을 요구합니다. 침착하게 문제를 제기하세요.', role: 'taxi driver' },
    { cat: 'friends', kind: 'general', ko: '외국인 친구에게 이번 주말에 같이 브런치를 먹을 수 있는지, 어느 날이 편한지 물어보세요.', role: 'friend' },
    { cat: 'friends', kind: 'tricky', ko: '친구가 같이 가기로 한 여행 비용을 아직 나에게 보내지 않았어요. 관계가 어색해지지 않게 이 이야기를 꺼내고 언제 보낼 수 있는지 물어보세요.', role: 'close friend' },
    { cat: 'exercise', kind: 'general', ko: '헬스장에서 1일 이용권이 있는지, 샤워실을 쓸 수 있는지 물어보세요.', role: 'gym front desk staff' },
    { cat: 'exercise', kind: 'tricky', ko: '러닝 대회 등록을 했는데 출발 명단에 내 이름이 없어요. 결제 확인 메일이 있다고 설명하고 오늘 뛸 수 있게 해 달라고 요청하세요.', role: 'race registration staff' },
    { cat: 'school', kind: 'general', ko: '어학원 첫날, 수업 자료를 어디서 받을 수 있는지와 결석할 때 누구에게 연락해야 하는지 물어보세요.', role: 'school coordinator' },
    { cat: 'school', kind: 'tricky', ko: '수료증에 내 이름 철자가 틀리게 적혀 있고, 다음 주에 제출해야 합니다. 상황을 설명하고 빨리 재발급을 요청하세요.', role: 'school administrator' },
    { cat: 'home', kind: 'general', ko: '집주인에게 다음 주 중에 세탁기 점검을 받을 수 있는 날짜가 언제인지 물어보세요.', role: 'landlord' },
    { cat: 'home', kind: 'tricky', ko: '수리 기사가 약속한 시간에 오지 않아 반차까지 썼는데, 업체에서는 다음 주에야 가능하다고 합니다. 불편을 설명하고 더 빠른 방법을 요청하세요.', role: 'repair company customer service' },
    { cat: 'travel', kind: 'general', ko: '투어 데스크에서 내일 오전 반나절 투어에 아직 자리가 있는지, 픽업이 포함되는지 물어보세요.', role: 'tour desk staff' },
    { cat: 'travel', kind: 'tricky', ko: '예약한 스노클링 투어가 날씨 때문에 취소됐는데, 업체는 환불 대신 다른 날짜만 가능하다고 합니다. 내일 출국하는 상황을 설명하고 환불을 요청하세요.', role: 'tour company staff' }
  ],

  finishStems: [
    { stem: "I understand your policy, but…", ko: '정책은 이해하지만 예외를 요청하는 상황', focus: 'request' },
    { stem: "I've already explained the problem twice, so…", ko: '같은 설명을 반복한 뒤 다음 단계를 요구하는 상황', focus: 'conclusion' },
    { stem: "If that's the case, would it be possible to…", ko: '직원의 거절을 듣고 대안을 요청하는 상황', focus: 'request' },
    { stem: "The reason I'm asking is that…", ko: '질문하는 이유를 설명하는 상황', focus: 'reason' },
    { stem: "It's not that I don't like it, but…", ko: '선물이나 제안을 부드럽게 거절하는 상황', focus: 'reason' },
    { stem: "What I mean is…", ko: '상대가 내 말을 오해했을 때 바로잡는 상황', focus: 'conclusion' },
    { stem: "I booked this a month ago, and…", ko: '예약에 문제가 생겼을 때', focus: 'request' },
    { stem: "Looking back, I think…", ko: '지난 경험을 돌아보며 결론 내리기', focus: 'conclusion' },
    { stem: "The thing is, I have a flight at six, so…", ko: '시간 제약을 설명하며 요청하기', focus: 'request' },
    { stem: "I'd be happy to wait, as long as…", ko: '조건을 걸고 양보하기', focus: 'conclusion' },
    { stem: "That being said, I still feel that…", ko: '상대 입장을 인정한 뒤 내 의견 말하기', focus: 'reason' },
    { stem: "On top of that, the room…", ko: '불만 사항을 하나 더 덧붙이기', focus: 'request' },
    { stem: "It turned out that…", ko: '예상과 다른 결과를 이야기하기', focus: 'conclusion' },
    { stem: "Since I paid for the full package,…", ko: '지불한 근거로 권리를 요구하기', focus: 'request' },
    { stem: "I know you're busy, but could you…", ko: '바쁜 직원에게 부탁하기', focus: 'request' },
    { stem: "If anything, I'd say…", ko: '오히려 반대라고 말하기', focus: 'conclusion' },
    { stem: "Because the bus never showed up,…", ko: '원인과 결과 끝까지 말하기', focus: 'reason' },
    { stem: "Before you cancel it, can I just…", ko: '상대의 조치를 멈추고 요청하기', focus: 'request' }
  ],

  opicTypes: [
    { id: 'describe', ko: '일상·장소 묘사' },
    { id: 'routine', ko: '습관과 루틴' },
    { id: 'past', ko: '구체적인 과거 경험' },
    { id: 'compare', ko: '과거와 현재 비교' },
    { id: 'prefer', ko: '선호와 이유' },
    { id: 'problem', ko: '돌발 문제와 해결 경험' },
    { id: 'roleplay', ko: '롤플레이' },
    { id: 'opinion', ko: '의견 설명·확장' }
  ],

  opicTopics: [
    { id: 'home', ko: '집' }, { id: 'neighborhood', ko: '동네' }, { id: 'running', ko: '조깅·러닝' },
    { id: 'gym', ko: '운동·헬스' }, { id: 'travel', ko: '해외여행' }, { id: 'domestic', ko: '국내여행' },
    { id: 'cafe', ko: '카페' }, { id: 'music', ko: '음악 감상' }, { id: 'movies', ko: '영화 보기' },
    { id: 'park', ko: '공원 가기' }, { id: 'cooking', ko: '요리' }, { id: 'tech', ko: '돌발: 기술·인터넷' },
    { id: 'weather', ko: '돌발: 날씨·계절' }, { id: 'holiday', ko: '돌발: 명절·휴일' }
  ],

  /* OPIc 질문은행. 실제 기출이 아니라 공개된 출제 유형을 바탕으로 만든 연습 질문 */
  opicQuestions: [
    { t: 'intro', topic: 'self', q: "Let's start the interview now. Tell me a little bit about yourself.", ko: '자기소개를 해 주세요.' },

    { t: 'describe', topic: 'home', q: "You indicated in the survey that you live in a house or an apartment. Describe your home to me. What does it look like? How many rooms does it have? Describe it in as much detail as possible.", ko: '사는 집을 자세히 묘사해 주세요.' },
    { t: 'routine', topic: 'home', q: "What do you usually do at home on a typical weekday? Tell me about your routine from the moment you get home until you go to bed.", ko: '평일 집에서의 일과를 말해 주세요.' },
    { t: 'compare', topic: 'home', q: "Tell me about the home you lived in when you were a child. How was it different from the place you live now?", ko: '어릴 때 살던 집과 지금 집을 비교해 주세요.' },
    { t: 'past', topic: 'home', q: "Have you ever had a problem at home, like something breaking or a leak? Tell me what happened and how you dealt with it.", ko: '집에서 문제가 생겼던 경험과 해결 과정을 말해 주세요.' },

    { t: 'describe', topic: 'neighborhood', q: "Describe your neighborhood. What is it like, and what kinds of places are there?", ko: '동네를 묘사해 주세요.' },
    { t: 'compare', topic: 'neighborhood', q: "How has your neighborhood changed over the past few years? Describe what it was like before and how it is now.", ko: '동네가 몇 년 사이 어떻게 변했는지 말해 주세요.' },
    { t: 'past', topic: 'neighborhood', q: "Tell me about a memorable experience you had in your neighborhood. What happened, and why was it memorable?", ko: '동네에서 기억에 남는 경험을 말해 주세요.' },

    { t: 'describe', topic: 'running', q: "You indicated that you go jogging. Where do you usually go running, and what is that place like?", ko: '주로 뛰는 장소를 묘사해 주세요.' },
    { t: 'routine', topic: 'running', q: "Tell me about your jogging routine. When do you run, how long do you run, and what do you do before and after?", ko: '러닝 루틴을 말해 주세요.' },
    { t: 'past', topic: 'running', q: "Tell me about a time when something unexpected happened while you were running. What happened, and how did you handle it?", ko: '달리다가 예상치 못한 일이 생긴 경험을 말해 주세요.' },
    { t: 'compare', topic: 'running', q: "How did you first get into running? How is the way you run now different from when you first started?", ko: '처음 달리기를 시작했을 때와 지금을 비교해 주세요.' },

    { t: 'describe', topic: 'gym', q: "Describe the gym or place where you usually work out. What does it look like, and what equipment is there?", ko: '운동하는 장소를 묘사해 주세요.' },
    { t: 'prefer', topic: 'gym', q: "Some people prefer working out alone, while others prefer exercising with other people. Which do you prefer, and why?", ko: '혼자 운동하는 것과 함께 하는 것 중 무엇을 선호하는지와 이유.' },
    { t: 'problem', topic: 'gym', q: "Have you ever been injured or had a problem while exercising? Tell me the whole story from beginning to end.", ko: '운동 중 다치거나 문제가 생긴 경험을 처음부터 끝까지 말해 주세요.' },

    { t: 'describe', topic: 'travel', q: "You indicated that you like to travel abroad. Tell me about a country or city you have visited. What was it like?", ko: '다녀온 나라나 도시를 묘사해 주세요.' },
    { t: 'routine', topic: 'travel', q: "What do you usually do to prepare for a trip abroad? Walk me through your process.", ko: '해외여행을 준비하는 과정을 말해 주세요.' },
    { t: 'problem', topic: 'travel', q: "Tell me about a time when something went wrong during a trip. What happened, how did you solve it, and how did it turn out?", ko: '여행 중 문제가 생긴 경험과 해결 과정, 결과를 말해 주세요.' },
    { t: 'past', topic: 'travel', q: "Tell me about the most memorable trip you have ever taken. Who did you go with, what did you do, and why was it so special?", ko: '가장 기억에 남는 여행을 말해 주세요.' },
    { t: 'compare', topic: 'travel', q: "How have the ways people travel changed compared to the past? Talk about the changes you have noticed.", ko: '여행 방식이 과거와 비교해 어떻게 바뀌었는지 말해 주세요.' },

    { t: 'describe', topic: 'domestic', q: "Tell me about a place in your country that you like to visit. What is it like, and what do people do there?", ko: '국내에서 좋아하는 여행지를 묘사해 주세요.' },
    { t: 'past', topic: 'domestic', q: "Tell me about a recent trip you took within your country. Where did you go, and what happened?", ko: '최근 다녀온 국내 여행 이야기를 해 주세요.' },

    { t: 'describe', topic: 'cafe', q: "Describe a cafe you often go to. Where is it, what does it look like, and why do you like it?", ko: '자주 가는 카페를 묘사해 주세요.' },
    { t: 'routine', topic: 'cafe', q: "What do you usually do when you go to a cafe? Who do you go with, and what do you typically order?", ko: '카페에 가면 주로 무엇을 하는지 말해 주세요.' },
    { t: 'compare', topic: 'cafe', q: "How have cafes in your country changed over the years? Compare cafes in the past with cafes today.", ko: '카페가 예전과 지금 어떻게 달라졌는지 말해 주세요.' },

    { t: 'describe', topic: 'music', q: "What kind of music do you like, and who are some of your favorite artists? Why do you like them?", ko: '좋아하는 음악과 가수를 말해 주세요.' },
    { t: 'past', topic: 'music', q: "Tell me about a live concert or performance you went to. What was it like from beginning to end?", ko: '다녀온 공연 경험을 처음부터 끝까지 말해 주세요.' },
    { t: 'compare', topic: 'music', q: "How has the way you listen to music changed since you were younger?", ko: '음악 듣는 방식이 어릴 때와 어떻게 달라졌는지 말해 주세요.' },

    { t: 'describe', topic: 'movies', q: "What kinds of movies do you like to watch? Tell me about your favorite actor or a movie you like.", ko: '좋아하는 영화 장르나 배우를 말해 주세요.' },
    { t: 'past', topic: 'movies', q: "Tell me about a memorable experience you had while going to the movies.", ko: '영화관에서 기억에 남는 경험을 말해 주세요.' },

    { t: 'describe', topic: 'park', q: "Describe a park you often go to. What does it look like, and what do people do there?", ko: '자주 가는 공원을 묘사해 주세요.' },
    { t: 'past', topic: 'park', q: "Tell me about a special day you spent at a park. What happened?", ko: '공원에서 보낸 특별한 하루를 말해 주세요.' },

    { t: 'describe', topic: 'cooking', q: "What kind of food do you like to cook? Tell me how you make one of your favorite dishes.", ko: '좋아하는 요리와 만드는 과정을 말해 주세요.' },
    { t: 'problem', topic: 'cooking', q: "Tell me about a time when your cooking didn't go as planned. What went wrong, and what did you do?", ko: '요리가 계획대로 안 됐던 경험을 말해 주세요.' },

    { t: 'describe', topic: 'tech', q: "What kinds of technology do people in your country use every day? Describe how people use them.", ko: '사람들이 매일 쓰는 기술을 묘사해 주세요.' },
    { t: 'compare', topic: 'tech', q: "How has technology changed the way people communicate compared to ten years ago?", ko: '기술이 10년 전과 비교해 소통 방식을 어떻게 바꿨는지 말해 주세요.' },
    { t: 'problem', topic: 'tech', q: "Tell me about a time when you had trouble with a phone, computer, or the internet. What happened, and how did you fix it?", ko: '기기나 인터넷 문제를 겪고 해결한 경험을 말해 주세요.' },

    { t: 'describe', topic: 'weather', q: "Describe the weather in your country. How is each season different?", ko: '나라의 날씨와 계절별 차이를 말해 주세요.' },
    { t: 'compare', topic: 'weather', q: "How is the weather today different from the weather when you were a child?", ko: '어릴 때와 지금의 날씨 차이를 말해 주세요.' },

    { t: 'describe', topic: 'holiday', q: "Tell me about a major holiday in your country. What do people usually do on that day?", ko: '나라의 대표 명절과 사람들이 하는 일을 말해 주세요.' },
    { t: 'past', topic: 'holiday', q: "Tell me about a memorable holiday you spent with your family or friends.", ko: '가족이나 친구와 보낸 기억에 남는 휴일을 말해 주세요.' },

    /* 롤플레이 3단 세트: ask(질문하기) / solve(문제 해결) / related(관련 경험) */
    { t: 'roleplay', step: 'ask', topic: 'travel', q: "I'd like to give you a situation and ask you to act it out. You are planning a trip and want to book a hotel. Call the hotel and ask three or four questions about the room and the services.", ko: '[롤플레이-질문] 호텔에 전화해 방과 서비스에 대해 질문 3~4개 하기' },
    { t: 'roleplay', step: 'solve', topic: 'travel', q: "I'm sorry, but there is a problem I need you to resolve. When you arrive at the hotel, you find out that your reservation has been canceled by mistake. Call the travel agency, explain the situation, and offer two or three alternatives to solve the problem.", ko: '[롤플레이-해결] 예약이 실수로 취소됨. 여행사에 상황 설명하고 대안 2~3개 제시' },
    { t: 'roleplay', step: 'related', topic: 'travel', q: "That's the end of the situation. Have you ever had a similar problem with a reservation? Tell me what happened and how you resolved it.", ko: '[롤플레이-관련 경험] 예약 문제를 겪었던 비슷한 경험 말하기' },
    { t: 'roleplay', step: 'ask', topic: 'gym', q: "I'd like to give you a situation and ask you to act it out. You want to join a new gym. Call the gym and ask three or four questions to get the information you need.", ko: '[롤플레이-질문] 새 헬스장에 전화해 질문 3~4개 하기' },
    { t: 'roleplay', step: 'solve', topic: 'gym', q: "I'm sorry, but there is a problem I need you to resolve. You signed up for a personal training session, but you suddenly can't make it because of an emergency. Call the trainer, explain the situation, and suggest two or three alternatives.", ko: '[롤플레이-해결] PT 수업에 급한 일로 못 감. 트레이너에게 설명하고 대안 제시' },
    { t: 'roleplay', step: 'related', topic: 'gym', q: "That's the end of the situation. Have you ever had to cancel or change plans at the last minute? Tell me about it in detail.", ko: '[롤플레이-관련 경험] 마지막 순간에 일정을 바꿔야 했던 경험' },
    { t: 'roleplay', step: 'ask', topic: 'cafe', q: "I'd like to give you a situation and ask you to act it out. A new cafe has opened in your neighborhood. Go to the cafe and ask the barista three or four questions about the menu.", ko: '[롤플레이-질문] 새 카페 직원에게 메뉴에 대해 질문 3~4개 하기' },
    { t: 'roleplay', step: 'solve', topic: 'cafe', q: "I'm sorry, but there is a problem I need you to resolve. You ordered drinks for your friends, but the barista made the wrong drinks and you have to leave soon. Explain the situation and offer two or three alternatives.", ko: '[롤플레이-해결] 음료가 잘못 나왔는데 곧 나가야 함. 설명하고 대안 제시' },
    { t: 'roleplay', step: 'related', topic: 'cafe', q: "That's the end of the situation. Have you ever received the wrong order at a restaurant or cafe? What happened, and how did you handle it?", ko: '[롤플레이-관련 경험] 주문이 잘못 나온 경험' },

    /* 고난도 14~15번: 비교·사회 이슈 */
    { t: 'opinion', topic: 'tech', q: "Some people say that smartphones have made people less social. What do you think about this? Give specific reasons and examples.", ko: '[고난도] 스마트폰이 사람들을 덜 사교적으로 만들었다는 의견에 대한 생각' },
    { t: 'opinion', topic: 'travel', q: "Many popular tourist destinations are suffering from too many visitors. What problems does this cause, and what do you think should be done about it?", ko: '[고난도] 관광객 과밀 문제와 해결 방안에 대한 의견' },
    { t: 'opinion', topic: 'running', q: "More and more people are interested in health and fitness these days. Why do you think this is happening, and is it a positive trend?", ko: '[고난도] 건강·운동에 대한 관심 증가의 이유와 평가' },
    { t: 'opinion', topic: 'home', q: "Housing prices have become a big issue in many countries. What concerns do people have about housing, and how do you think it affects young people?", ko: '[고난도] 집값 문제가 사람들과 젊은 세대에 미치는 영향' },
    { t: 'opinion', topic: 'cafe', q: "Some people worry that cafes and restaurants create too much waste, like plastic cups. What do you think businesses and customers should do?", ko: '[고난도] 카페·식당 일회용품 문제에 대한 의견' },
    { t: 'opinion', topic: 'neighborhood', q: "What are some issues or concerns that people in your neighborhood talk about these days? Why are they important?", ko: '[고난도] 동네 사람들이 요즘 걱정하는 이슈와 그 이유' }
  ],

  weakTags: ['연결어 선택', '문장 완결', '직역 표현', '요청 뉘앙스', '이유·결론 연결', '시제', '관사·전치사', '어휘 선택', '구조 단순화']
};
