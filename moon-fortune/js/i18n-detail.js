// 해외 언어용 상세 결과. 한국어 원문을 번역하는 대신 동일한 계산 데이터를 현지화된 템플릿에 넣는다.
const DETAIL_LABEL_KEYS = ['overview', 'energy', 'areas', 'love', 'money', 'work', 'health', 'timing', 'best', 'caution', 'good', 'avoid', 'luck', 'color', 'number', 'direction', 'time', 'item', 'food', 'pillars', 'year', 'month', 'day', 'hour', 'dayMaster', 'personality', 'strength', 'watch', 'elements', 'balance', 'helpful', 'theme', 'decade', 'current', 'next', 'zodiacProfile', 'loveStyle', 'career', 'moneyStyle', 'healthSymbol', 'compatibility', 'elementRelation', 'zodiacRelation', 'advice', 'periodFlow', 'calc', 'entertainment', 'score', 'average', 'today', 'thisWeek', 'thisMonth', 'thisYear', 'early', 'middle', 'late', 'unknownTime'];
function makeDetail(labels, extra) { return { l: Object.fromEntries(DETAIL_LABEL_KEYS.map((k, i) => [k, labels[i]])), ...extra }; }

const DETAIL_I18N = {
  en: makeDetail(
    ['Overview', 'Core energy', 'Fortune by area', 'Love', 'Money', 'Work & study', 'Well-being', 'Flow by time', 'Best point', 'Take care', 'Good moves', 'Better to avoid', 'Lucky guide', 'Color', 'Number', 'Direction', 'Time', 'Item', 'Food', 'Four pillars', 'Year pillar', 'Month pillar', 'Day pillar', 'Hour pillar', 'Day master', 'Personality pattern', 'Natural strengths', 'Watch for', 'Five-element balance', 'Balance type', 'Helpful element', 'Dominant life theme', 'Ten-year cycles', 'Current cycle', 'Next cycle', 'Zodiac profile', 'Love style', 'Career & talents', 'Money style', 'Health symbolism', 'Compatibility reading', 'Element relationship', 'Zodiac relationship', 'Practical advice', 'Period flow', 'Calculation basis', 'Traditional fortune content for entertainment; not professional advice.', 'Score', 'Average', 'Today', 'This week', 'This month', 'This year', 'Early', 'Middle', 'Late', 'Birth time unknown'],
    { relation: ['Support, learning and helpful people are emphasized. Accept advice without giving away your judgment.', 'Peers, competition and independence are emphasized. Cooperation works best with clear boundaries.', 'Expression, creativity and output are emphasized. Turn ideas into something visible.', 'Practical results, money and responsibility for resources are emphasized. Check the numbers before acting.', 'Rules, duty and reputation are emphasized. A steady process will earn more trust than speed.'],
      element: ['Growth, planning and initiative are natural strengths. Flexibility keeps determination from becoming rigidity.', 'Warmth, visibility and passion are strong. Pace your energy so enthusiasm lasts.', 'Reliability, patience and practical care stand out. Leave room for change instead of holding everything in place.', 'Judgment, precision and decisive action are strong. Softer wording improves cooperation.', 'Insight, adaptability and broad thinking are strong. A clear target keeps energy from scattering.'],
      strength: ['Your chart benefits from support, recovery and a stable base before expansion.', 'Your chart is relatively balanced; timing and consistent habits matter more than extremes.', 'Your chart has strong self-driven energy. Channel it into output and shared results.'],
      good: ['ask for informed advice', 'coordinate roles clearly', 'write, present or create', 'review budgets and agreements', 'follow the plan and document progress'],
      bad: ['depending on others for every answer', 'comparison and unclear money deals', 'speaking before checking facts', 'impulse spending and rushed contracts', 'overwork and rigid perfectionism'],
      compat: ['The connection needs patience and explicit boundaries. Slow, honest conversation matters most.', 'There are differences, but they can become complementary when expectations are spoken clearly.', 'A stable match with room to grow. Regular check-ins keep the relationship warm.', 'A naturally supportive connection. Shared plans and practical follow-through strengthen it.', 'A very fluid match. Enjoy the ease while still respecting each person’s independence.'],
      colors: ['Green', 'Red', 'Gold', 'White', 'Navy'], dirs: ['East', 'South', 'Center', 'West', 'North'], items: ['wooden accessory', 'small light or candle', 'ceramic cup', 'metal accessory', 'water bottle'], foods: ['leafy vegetables', 'red fruit or warm tea', 'whole grains or pumpkin', 'pear or radish', 'seaweed or black beans'], times: ['Morning', 'Midday', 'Afternoon', 'Evening'] }
  ),
  ja: makeDetail(
    ['全体像', '中心となる気', '分野別運勢', '恋愛運', '金運', '仕事・学業運', '健康運', '時間帯の流れ', '最良ポイント', '注意点', 'おすすめ行動', '避けたいこと', 'ラッキーガイド', '色', '数字', '方角', '時間', 'アイテム', '食べ物', '四柱', '年柱', '月柱', '日柱', '時柱', '日主', '性格の傾向', '生まれ持った強み', '気をつける点', '五行バランス', '身強・身弱', '助けになる五行', '強い人生テーマ', '大運の流れ', '現在の大運', '次の大運', '星座プロフィール', '恋愛スタイル', '仕事・才能', 'お金の傾向', '健康の象徴', '相性解説', '五行の関係', '星座の関係', '実践アドバイス', '時期別の流れ', '計算基準', '伝統占術をもとにしたエンタメコンテンツで、専門的助言ではありません。', 'スコア', '平均', '今日', '今週', '今月', '今年', '上旬', '中旬', '下旬', '出生時刻不明'],
    { relation: ['援助・学び・よい助言者の気が強まります。助言を受けつつ、自分の判断も大切にしましょう。', '仲間・競争・自立の気が強まります。役割と境界を明確にすると協力が実ります。', '表現・創造・成果を外に出す気が強まります。アイデアを形にしましょう。', '現実的な成果・お金・資源管理の気が強まります。動く前に数字を確認しましょう。', '規則・責任・評価の気が強まります。速さより確かな手順が信頼につながります。'],
      element: ['成長力・計画性・行動力が強みです。柔軟さを持つと意志の強さがより生きます。', '温かさ・存在感・情熱が魅力です。エネルギー配分を意識すると長く輝けます。', '信頼感・忍耐・現実的な支えが強みです。変化の余地も残しましょう。', '判断力・精密さ・決断力が強みです。柔らかな言葉が協力を広げます。', '洞察力・適応力・広い視野が強みです。目標を一つ定めると力が散りません。'],
      strength: ['まず支えと回復、安定した基盤を整えることで運が伸びます。', '比較的バランスがよく、極端さよりタイミングと習慣が重要です。', '自力で進む力が強い命式です。成果を外に出し、周囲と分かち合いましょう。'],
      good: ['経験者に相談する', '役割を明確にして協力する', '書く・話す・作る', '予算と約束を確認する', '計画を守り記録を残す'],
      bad: ['すべての答えを人任せにする', '比較と曖昧なお金の貸し借り', '確認せずに話す', '衝動買いと急な契約', '働きすぎと完璧主義'],
      compat: ['忍耐と明確な境界が必要な関係です。ゆっくり率直に話すことが最優先です。', '違いはありますが、期待を言葉にすれば補い合える関係です。', '安定感があり成長の余地もある相性です。定期的な対話が温かさを守ります。', '自然に支え合える相性です。共通の計画を実行するとさらに強くなります。', 'とても流れのよい相性です。心地よさを楽しみつつ互いの自立も尊重しましょう。'],
      colors: ['緑', '赤', '金色', '白', '紺'], dirs: ['東', '南', '中央', '西', '北'], items: ['木の小物', '小さなライトやキャンドル', '陶器のカップ', '金属アクセサリー', '水筒'], foods: ['葉物野菜', '赤い果物や温かいお茶', '穀物やかぼちゃ', '梨や大根', '海藻や黒豆'], times: ['朝', '昼', '午後', '夜'] }
  ),
  zh: makeDetail(
    ['整体解读', '核心气场', '分项运势', '感情运', '财运', '事业·学业', '健康状态', '分时走势', '最佳时机', '注意事项', '适合行动', '尽量避免', '幸运指南', '颜色', '数字', '方位', '时间', '物品', '食物', '四柱', '年柱', '月柱', '日柱', '时柱', '日主', '性格模式', '天生优势', '需要留意', '五行平衡', '强弱状态', '有利五行', '突出人生主题', '大运走势', '当前大运', '下一步大运', '星座画像', '恋爱方式', '事业与才能', '金钱观', '健康象征', '缘分解读', '五行关系', '星座关系', '实际建议', '阶段走势', '计算依据', '基于传统命理的娱乐内容，不构成专业建议。', '分数', '平均', '今天', '本周', '本月', '今年', '上旬', '中旬', '下旬', '出生时间未知'],
    { relation: ['贵人、学习和支持的力量突出。可以听取建议，但仍要保留自己的判断。', '同伴、竞争和独立性突出。明确角色与边界，合作会更顺利。', '表达、创意和输出的力量突出。把想法变成看得见的成果。', '现实成果、金钱与资源责任突出。行动前先核对数字。', '规则、责任和名誉突出。稳妥的过程比速度更能赢得信任。'],
      element: ['成长、规划和主动性是优势。保持灵活，坚定就不会变成固执。', '温暖、存在感和热情很强。控制节奏，热情才能持续。', '可靠、耐心和实际照顾是优势。别把一切固定死，要给变化留空间。', '判断、精确和决断力很强。柔和表达能带来更多合作。', '洞察、适应和广阔思维是优势。设定清晰目标，能量就不会分散。'],
      strength: ['先建立支持、恢复与稳定基础，再扩张会更顺利。', '整体较为平衡，时机和持续习惯比走极端更重要。', '自我推动力很强。把力量用于产出，并与他人分享成果。'],
      good: ['向有经验的人请教', '明确分工后合作', '写作、表达或创作', '检查预算与约定', '按计划推进并留下记录'],
      bad: ['所有答案都依赖别人', '比较心与含糊的金钱往来', '没确认事实就发言', '冲动消费和仓促签约', '过度工作和完美主义'],
      compat: ['这段关系需要耐心和清晰边界。放慢速度、坦诚沟通最重要。', '彼此有差异，但说清期待后可以形成互补。', '稳定且有成长空间的关系。定期沟通能保持温度。', '自然互相支持的组合。共同计划并落实会更稳固。', '非常顺畅的组合。享受默契，也要尊重各自独立。'],
      colors: ['绿色', '红色', '金色', '白色', '藏青色'], dirs: ['东方', '南方', '中央', '西方', '北方'], items: ['木质小物', '小灯或蜡烛', '陶瓷杯', '金属饰品', '水瓶'], foods: ['绿叶蔬菜', '红色水果或热茶', '杂粮或南瓜', '梨或萝卜', '海藻或黑豆'], times: ['早晨', '中午', '下午', '晚上'] }
  ),
  vi: makeDetail(
    ['Tổng quan', 'Năng lượng cốt lõi', 'Vận theo lĩnh vực', 'Tình cảm', 'Tài chính', 'Công việc & học tập', 'Sức khỏe', 'Dòng chảy theo giờ', 'Điểm tốt nhất', 'Điều cần lưu ý', 'Việc nên làm', 'Nên tránh', 'Gợi ý may mắn', 'Màu sắc', 'Con số', 'Phương hướng', 'Thời gian', 'Vật phẩm', 'Thức ăn', 'Bốn trụ', 'Trụ năm', 'Trụ tháng', 'Trụ ngày', 'Trụ giờ', 'Nhật chủ', 'Mẫu tính cách', 'Thế mạnh bẩm sinh', 'Điểm cần chú ý', 'Cân bằng ngũ hành', 'Trạng thái cân bằng', 'Hành hỗ trợ', 'Chủ đề nổi bật', 'Chu kỳ 10 năm', 'Chu kỳ hiện tại', 'Chu kỳ tiếp theo', 'Hồ sơ hoàng đạo', 'Phong cách yêu', 'Sự nghiệp & tài năng', 'Cách dùng tiền', 'Biểu tượng sức khỏe', 'Luận giải hòa hợp', 'Quan hệ ngũ hành', 'Quan hệ hoàng đạo', 'Lời khuyên thực tế', 'Dòng chảy từng giai đoạn', 'Cơ sở tính toán', 'Nội dung giải trí dựa trên hệ thống truyền thống, không phải lời khuyên chuyên môn.', 'Điểm', 'Trung bình', 'Hôm nay', 'Tuần này', 'Tháng này', 'Năm nay', 'Đầu kỳ', 'Giữa kỳ', 'Cuối kỳ', 'Không rõ giờ sinh'],
    { relation: ['Năng lượng hỗ trợ, học hỏi và quý nhân nổi bật. Hãy lắng nghe lời khuyên nhưng vẫn giữ phán đoán của mình.', 'Bạn bè, cạnh tranh và tính độc lập nổi bật. Hợp tác tốt nhất khi vai trò và ranh giới rõ ràng.', 'Biểu đạt, sáng tạo và tạo ra kết quả nổi bật. Hãy biến ý tưởng thành thứ có thể nhìn thấy.', 'Kết quả thực tế, tiền bạc và trách nhiệm nguồn lực nổi bật. Kiểm tra con số trước khi hành động.', 'Quy tắc, trách nhiệm và danh tiếng nổi bật. Quy trình vững vàng tạo niềm tin hơn tốc độ.'],
      element: ['Khả năng phát triển, lập kế hoạch và chủ động là thế mạnh. Linh hoạt giúp quyết tâm không thành cứng nhắc.', 'Sự ấm áp, nổi bật và đam mê rất mạnh. Điều tiết năng lượng để nhiệt huyết bền lâu.', 'Đáng tin, kiên nhẫn và biết chăm lo thực tế. Hãy chừa chỗ cho thay đổi.', 'Phán đoán, chính xác và quyết đoán là thế mạnh. Cách nói mềm mại giúp hợp tác tốt hơn.', 'Trực giác, thích nghi và tầm nhìn rộng là thế mạnh. Mục tiêu rõ ràng giúp năng lượng không phân tán.'],
      strength: ['Lá số này cần sự hỗ trợ, hồi phục và nền tảng ổn định trước khi mở rộng.', 'Lá số khá cân bằng; thời điểm và thói quen đều đặn quan trọng hơn cực đoan.', 'Năng lượng tự thân mạnh. Hãy đưa nó vào thành quả và chia sẻ kết quả với người khác.'],
      good: ['hỏi ý kiến người có kinh nghiệm', 'phân vai rõ ràng để hợp tác', 'viết, trình bày hoặc sáng tạo', 'kiểm tra ngân sách và cam kết', 'theo kế hoạch và ghi lại tiến độ'],
      bad: ['phụ thuộc người khác cho mọi câu trả lời', 'so sánh và giao dịch tiền bạc mơ hồ', 'nói trước khi kiểm chứng', 'mua sắm bốc đồng và ký vội', 'làm quá sức và cầu toàn'],
      compat: ['Mối liên hệ cần kiên nhẫn và ranh giới rõ. Trò chuyện chậm rãi, thành thật là quan trọng nhất.', 'Có khác biệt nhưng có thể bù trừ khi kỳ vọng được nói rõ.', 'Một sự kết hợp ổn định và còn không gian phát triển. Trao đổi đều đặn giữ sự ấm áp.', 'Hai người tự nhiên hỗ trợ nhau. Kế hoạch chung và hành động thực tế làm mối quan hệ vững hơn.', 'Một sự kết hợp rất trôi chảy. Hãy tận hưởng sự ăn ý nhưng vẫn tôn trọng tính độc lập.'],
      colors: ['Xanh lá', 'Đỏ', 'Vàng', 'Trắng', 'Xanh đậm'], dirs: ['Đông', 'Nam', 'Trung tâm', 'Tây', 'Bắc'], items: ['đồ gỗ nhỏ', 'đèn nhỏ hoặc nến', 'cốc gốm', 'phụ kiện kim loại', 'bình nước'], foods: ['rau lá xanh', 'trái cây đỏ hoặc trà ấm', 'ngũ cốc hoặc bí đỏ', 'lê hoặc củ cải', 'rong biển hoặc đậu đen'], times: ['Buổi sáng', 'Buổi trưa', 'Buổi chiều', 'Buổi tối'] }
  ),
  es: makeDetail(
    ['Panorama general', 'Energía central', 'Fortuna por áreas', 'Amor', 'Dinero', 'Trabajo y estudios', 'Bienestar', 'Flujo por horas', 'Mejor punto', 'Atención', 'Acciones favorables', 'Mejor evitar', 'Guía de suerte', 'Color', 'Número', 'Dirección', 'Hora', 'Objeto', 'Comida', 'Cuatro pilares', 'Pilar del año', 'Pilar del mes', 'Pilar del día', 'Pilar de la hora', 'Maestro del día', 'Patrón de personalidad', 'Fortalezas naturales', 'A vigilar', 'Balance de cinco elementos', 'Tipo de equilibrio', 'Elemento favorable', 'Tema vital dominante', 'Ciclos de diez años', 'Ciclo actual', 'Próximo ciclo', 'Perfil zodiacal', 'Estilo amoroso', 'Carrera y talentos', 'Estilo financiero', 'Simbolismo de salud', 'Lectura de compatibilidad', 'Relación elemental', 'Relación zodiacal', 'Consejo práctico', 'Flujo por periodos', 'Base del cálculo', 'Contenido de entretenimiento basado en sistemas tradicionales; no es asesoramiento profesional.', 'Puntuación', 'Promedio', 'Hoy', 'Esta semana', 'Este mes', 'Este año', 'Inicio', 'Mitad', 'Final', 'Hora de nacimiento desconocida'],
    { relation: ['Se acentúan el apoyo, el aprendizaje y las personas útiles. Escucha consejos sin ceder tu propio criterio.', 'Se acentúan los iguales, la competencia y la independencia. La cooperación mejora con límites claros.', 'Se acentúan la expresión, la creatividad y la producción. Convierte las ideas en algo visible.', 'Se acentúan los resultados prácticos, el dinero y los recursos. Revisa las cifras antes de actuar.', 'Se acentúan las normas, la responsabilidad y la reputación. Un proceso firme genera más confianza que la prisa.'],
      element: ['Crecimiento, planificación e iniciativa son fortalezas. La flexibilidad evita que la decisión se vuelva rigidez.', 'Calidez, visibilidad y pasión destacan. Regula tu energía para mantener el entusiasmo.', 'Fiabilidad, paciencia y cuidado práctico destacan. Deja espacio para el cambio.', 'Juicio, precisión y decisión son fortalezas. Un tono suave mejora la cooperación.', 'Intuición, adaptación y visión amplia son fortalezas. Un objetivo claro evita dispersarte.'],
      strength: ['Esta carta necesita apoyo, recuperación y una base estable antes de expandirse.', 'La carta está bastante equilibrada; el momento y los hábitos importan más que los extremos.', 'La energía propia es fuerte. Llévala a resultados y compártelos con otros.'],
      good: ['pedir consejo informado', 'coordinar funciones con claridad', 'escribir, presentar o crear', 'revisar presupuestos y acuerdos', 'seguir el plan y registrar avances'],
      bad: ['depender de otros para cada respuesta', 'comparaciones y tratos de dinero ambiguos', 'hablar sin comprobar los hechos', 'compras impulsivas y contratos apresurados', 'exceso de trabajo y perfeccionismo'],
      compat: ['La relación necesita paciencia y límites explícitos. Hablar despacio y con honestidad es lo principal.', 'Hay diferencias, pero pueden complementarse cuando las expectativas se expresan.', 'Una unión estable con espacio para crecer. Las conversaciones regulares mantienen la calidez.', 'Una conexión naturalmente solidaria. Los planes comunes y su ejecución la fortalecen.', 'Una unión muy fluida. Disfrutad la facilidad respetando la independencia de cada uno.'],
      colors: ['Verde', 'Rojo', 'Dorado', 'Blanco', 'Azul marino'], dirs: ['Este', 'Sur', 'Centro', 'Oeste', 'Norte'], items: ['accesorio de madera', 'luz pequeña o vela', 'taza de cerámica', 'accesorio metálico', 'botella de agua'], foods: ['verduras de hoja', 'fruta roja o té caliente', 'cereales o calabaza', 'pera o rábano', 'algas o frijoles negros'], times: ['Mañana', 'Mediodía', 'Tarde', 'Noche'] }
  ),
  de: makeDetail(
    ['Überblick', 'Kernenergie', 'Orakel nach Lebensbereich', 'Liebe', 'Geld', 'Arbeit & Lernen', 'Wohlbefinden', 'Tageszeiten', 'Bester Punkt', 'Achtsam sein', 'Günstige Schritte', 'Besser vermeiden', 'Glücksratgeber', 'Farbe', 'Zahl', 'Richtung', 'Zeit', 'Gegenstand', 'Essen', 'Vier Säulen', 'Jahressäule', 'Monatssäule', 'Tagessäule', 'Stundensäule', 'Tagesmeister', 'Persönlichkeitsmuster', 'Natürliche Stärken', 'Darauf achten', 'Fünf-Elemente-Balance', 'Balance-Typ', 'Hilfreiches Element', 'Dominantes Lebensthema', 'Zehnjahreszyklen', 'Aktueller Zyklus', 'Nächster Zyklus', 'Tierkreisprofil', 'Liebesstil', 'Beruf & Talente', 'Umgang mit Geld', 'Gesundheitssymbolik', 'Partnerschaftsdeutung', 'Elementbeziehung', 'Tierkreisbeziehung', 'Praktischer Rat', 'Verlauf nach Zeitabschnitten', 'Berechnungsbasis', 'Unterhaltungsinhalt auf Grundlage traditioneller Systeme; keine professionelle Beratung.', 'Wertung', 'Durchschnitt', 'Heute', 'Diese Woche', 'Dieser Monat', 'Dieses Jahr', 'Anfang', 'Mitte', 'Ende', 'Geburtszeit unbekannt'],
    { relation: ['Unterstützung, Lernen und hilfreiche Menschen stehen im Vordergrund. Nimm Rat an, ohne dein Urteil abzugeben.', 'Gleichgesinnte, Wettbewerb und Eigenständigkeit stehen im Vordergrund. Klare Rollen verbessern die Zusammenarbeit.', 'Ausdruck, Kreativität und sichtbare Ergebnisse stehen im Vordergrund. Gib Ideen eine konkrete Form.', 'Praktische Ergebnisse, Geld und Verantwortung für Mittel stehen im Vordergrund. Prüfe Zahlen vor dem Handeln.', 'Regeln, Pflicht und Ansehen stehen im Vordergrund. Ein verlässlicher Ablauf schafft mehr Vertrauen als Tempo.'],
      element: ['Wachstum, Planung und Initiative sind Stärken. Flexibilität verhindert, dass Entschlossenheit starr wird.', 'Wärme, Sichtbarkeit und Leidenschaft sind stark. Teile deine Energie ein, damit Begeisterung anhält.', 'Verlässlichkeit, Geduld und praktische Fürsorge zeichnen dich aus. Lass Raum für Veränderung.', 'Urteilskraft, Präzision und Entschlossenheit sind stark. Eine sanftere Sprache verbessert Zusammenarbeit.', 'Einsicht, Anpassung und weites Denken sind stark. Ein klares Ziel verhindert, dass Energie zerstreut wird.'],
      strength: ['Diese Konstellation profitiert zuerst von Unterstützung, Erholung und einer stabilen Basis.', 'Die Konstellation ist relativ ausgeglichen; Timing und Gewohnheiten zählen mehr als Extreme.', 'Die Eigenenergie ist stark. Lenke sie in Ergebnisse und teile Erfolge mit anderen.'],
      good: ['fundierten Rat einholen', 'Rollen klar abstimmen', 'schreiben, präsentieren oder gestalten', 'Budgets und Absprachen prüfen', 'dem Plan folgen und Fortschritt festhalten'],
      bad: ['jede Antwort anderen überlassen', 'Vergleiche und unklare Geldgeschäfte', 'reden, bevor Fakten geprüft sind', 'Impulskäufe und übereilte Verträge', 'Überarbeitung und Perfektionismus'],
      compat: ['Die Verbindung braucht Geduld und klare Grenzen. Langsame, ehrliche Gespräche sind am wichtigsten.', 'Es gibt Unterschiede, doch ausgesprochene Erwartungen machen sie ergänzend.', 'Eine stabile Verbindung mit Entwicklungsspielraum. Regelmäßiger Austausch hält sie warm.', 'Eine natürlich unterstützende Verbindung. Gemeinsame Pläne und Umsetzung stärken sie.', 'Eine sehr fließende Verbindung. Genießt die Leichtigkeit und respektiert zugleich die Eigenständigkeit.'],
      colors: ['Grün', 'Rot', 'Gold', 'Weiß', 'Marineblau'], dirs: ['Osten', 'Süden', 'Mitte', 'Westen', 'Norden'], items: ['Holzaccessoire', 'kleines Licht oder Kerze', 'Keramiktasse', 'Metallaccessoire', 'Wasserflasche'], foods: ['Blattgemüse', 'rote Früchte oder warmer Tee', 'Vollkorn oder Kürbis', 'Birne oder Rettich', 'Algen oder schwarze Bohnen'], times: ['Morgen', 'Mittag', 'Nachmittag', 'Abend'] }
  ),
};

const TAROT_DETAIL_WORDS = {
  en: { major: ['a new beginning', 'will and skill', 'intuition', 'abundance and care', 'structure and authority', 'tradition and guidance', 'choice and union', 'determined progress', 'inner courage', 'reflection and wisdom', 'change of cycle', 'fairness and truth', 'a new perspective', 'transformation', 'balance and healing', 'attachment and temptation', 'sudden truth', 'hope and renewal', 'uncertainty and dreams', 'clarity and vitality', 'awakening', 'completion'], ranks: ['new potential', 'choice and balance', 'growth through cooperation', 'stability and review', 'change and challenge', 'recovery and movement', 'strategy and courage', 'speed and practice', 'resilience near the finish', 'completion and responsibility', 'news and curiosity', 'action and pursuit', 'mature care', 'leadership and responsibility'], suits: ['passion and action', 'emotion and relationships', 'thought and communication', 'money and practical foundations'], message: ['The energy is available now. Notice the clearest signal and turn it into one practical step.', 'The theme may be delayed, blocked or turned inward. Pause, review the pattern and adjust your approach.'] },
  ja: { major: ['新しい始まり', '意志と技術', '直感', '豊かさと育む力', '構造と権威', '伝統と導き', '選択と結びつき', '意志ある前進', '内なる勇気', '内省と知恵', '周期の変化', '公正と真実', '新しい視点', '変容', '調和と回復', '執着と誘惑', '突然の真実', '希望と再生', '不確かさと夢', '明晰さと活力', '目覚め', '完成'], ranks: ['新しい可能性', '選択と均衡', '協力による成長', '安定と見直し', '変化と試練', '回復と移動', '戦略と挑戦', '速度と熟練', '完成前の粘り', '結実と責任', '知らせと好奇心', '行動と追求', '成熟した配慮', '統率と責任'], suits: ['情熱と行動', '感情と関係', '思考と対話', 'お金と現実基盤'], message: ['今使えるエネルギーです。最も明確なサインを見つけ、現実的な一歩に変えましょう。', 'テーマが遅れたり内向きになったりしています。立ち止まってパターンを見直し、方法を調整しましょう。'] },
  zh: { major: ['新的开始', '意志与能力', '直觉', '丰盛与照料', '结构与权威', '传统与指引', '选择与结合', '坚定前进', '内在勇气', '反思与智慧', '周期变化', '公平与真相', '新的视角', '转化', '平衡与疗愈', '执着与诱惑', '突如其来的真相', '希望与更新', '不确定与梦境', '清晰与活力', '觉醒', '完成'], ranks: ['新的潜力', '选择与平衡', '合作成长', '稳定与调整', '变化与考验', '恢复与移动', '策略与挑战', '速度与熟练', '临近完成的韧性', '成果与责任', '消息与好奇', '行动与追求', '成熟的照料', '领导与责任'], suits: ['热情与行动', '情感与关系', '思考与沟通', '金钱与现实基础'], message: ['这股能量现在可以运用。找出最清晰的信号，把它变成一个实际行动。', '主题可能延迟、受阻或转向内在。先停下来复盘，再调整做法。'] },
  vi: { major: ['khởi đầu mới', 'ý chí và kỹ năng', 'trực giác', 'sự phong phú và chăm sóc', 'cấu trúc và quyền uy', 'truyền thống và dẫn dắt', 'lựa chọn và gắn kết', 'tiến bước quyết đoán', 'dũng khí nội tâm', 'chiêm nghiệm và trí tuệ', 'thay đổi chu kỳ', 'công bằng và sự thật', 'góc nhìn mới', 'chuyển hóa', 'cân bằng và hồi phục', 'ràng buộc và cám dỗ', 'sự thật bất ngờ', 'hy vọng và đổi mới', 'bất định và giấc mơ', 'rõ ràng và sức sống', 'thức tỉnh', 'hoàn thành'], ranks: ['tiềm năng mới', 'lựa chọn và cân bằng', 'phát triển qua hợp tác', 'ổn định và xem lại', 'thay đổi và thử thách', 'hồi phục và dịch chuyển', 'chiến lược và can đảm', 'tốc độ và rèn luyện', 'sức bền gần đích', 'hoàn tất và trách nhiệm', 'tin tức và tò mò', 'hành động và theo đuổi', 'chăm sóc trưởng thành', 'lãnh đạo và trách nhiệm'], suits: ['đam mê và hành động', 'cảm xúc và quan hệ', 'suy nghĩ và giao tiếp', 'tiền bạc và nền tảng thực tế'], message: ['Năng lượng này đang sẵn có. Hãy nhận ra tín hiệu rõ nhất và biến nó thành một bước thực tế.', 'Chủ đề có thể bị chậm, tắc hoặc hướng vào trong. Hãy dừng lại, xem lại khuôn mẫu và điều chỉnh cách làm.'] },
  es: { major: ['un nuevo comienzo', 'voluntad y habilidad', 'intuición', 'abundancia y cuidado', 'estructura y autoridad', 'tradición y guía', 'elección y unión', 'avance decidido', 'valor interior', 'reflexión y sabiduría', 'cambio de ciclo', 'justicia y verdad', 'una nueva perspectiva', 'transformación', 'equilibrio y sanación', 'apego y tentación', 'verdad repentina', 'esperanza y renovación', 'incertidumbre y sueños', 'claridad y vitalidad', 'despertar', 'culminación'], ranks: ['nuevo potencial', 'elección y equilibrio', 'crecimiento cooperativo', 'estabilidad y revisión', 'cambio y prueba', 'recuperación y movimiento', 'estrategia y valor', 'velocidad y práctica', 'resistencia cerca de la meta', 'culminación y responsabilidad', 'noticias y curiosidad', 'acción y búsqueda', 'cuidado maduro', 'liderazgo y responsabilidad'], suits: ['pasión y acción', 'emoción y relaciones', 'pensamiento y comunicación', 'dinero y base práctica'], message: ['La energía está disponible ahora. Observa la señal más clara y conviértela en un paso práctico.', 'El tema puede estar retrasado, bloqueado o vuelto hacia dentro. Detente, revisa el patrón y ajusta el enfoque.'] },
  de: { major: ['ein neuer Anfang', 'Wille und Können', 'Intuition', 'Fülle und Fürsorge', 'Struktur und Autorität', 'Tradition und Führung', 'Wahl und Verbindung', 'entschlossener Fortschritt', 'innerer Mut', 'Besinnung und Weisheit', 'Zykluswechsel', 'Fairness und Wahrheit', 'eine neue Perspektive', 'Verwandlung', 'Balance und Heilung', 'Bindung und Versuchung', 'plötzliche Wahrheit', 'Hoffnung und Erneuerung', 'Unsicherheit und Träume', 'Klarheit und Lebenskraft', 'Erwachen', 'Vollendung'], ranks: ['neues Potenzial', 'Wahl und Balance', 'Wachstum durch Zusammenarbeit', 'Stabilität und Prüfung', 'Veränderung und Herausforderung', 'Erholung und Bewegung', 'Strategie und Mut', 'Tempo und Übung', 'Ausdauer kurz vor dem Ziel', 'Abschluss und Verantwortung', 'Nachricht und Neugier', 'Handeln und Verfolgen', 'reife Fürsorge', 'Führung und Verantwortung'], suits: ['Leidenschaft und Handeln', 'Gefühl und Beziehungen', 'Denken und Kommunikation', 'Geld und praktische Grundlage'], message: ['Die Energie ist jetzt verfügbar. Erkenne das klarste Signal und mache daraus einen praktischen Schritt.', 'Das Thema kann verzögert, blockiert oder nach innen gerichtet sein. Halte inne, prüfe das Muster und passe deinen Weg an.'] },
};
function detailedTarotCardText(card, reversed) {
  if (locale === 'ko') return tarotCardText(card, reversed);
  const P = TAROT_DETAIL_WORDS[locale] || TAROT_DETAIL_WORDS.en;
  let base;
  if (card.arcana === 'major') base = P.major[TAROT.findIndex(x => x.n === card.n)];
  else { const [mark, rank] = card.n.split('-'), si = ['W', 'C', 'S', 'P'].indexOf(mark), ri = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Page', 'Knight', 'Queen', 'King'].indexOf(rank); base = `${P.ranks[ri]} · ${P.suits[si]}`; }
  return { keyword: reversed ? `${lang().tarot.reversed}: ${base}` : base, message: P.message[reversed ? 1 : 0] };
}

function detailLang() { return DETAIL_I18N[locale] || DETAIL_I18N.en; }
function detailCard(title, body, cls = '') { return `<div class="card ${cls}"><h3>${title}</h3>${body}</div>`; }
function detailScoreFrom(source, fallback = 70) { const m = source.html.match(/data-count="(\d+)"/); return m ? +m[1] : fallback; }
function detailRelationIndex(group) { return ['in', 'bi', 'sik', 'jae', 'gwan'].indexOf(group); }
function detailStrengthIndex(value) { return value === 'weak' ? 0 : value === 'balanced' ? 1 : 2; }
function detailLucky(A, seed) {
  const D = detailLang(), el = A.yong, info = ELEMENT_INFO[el], r = rngFor(seed, locale, 'localized-luck');
  return { color: D.colors[el], hex: info.colorHex, number: pick(r, info.nums), direction: D.dirs[el], time: D.times[Math.floor(r() * 4)], item: D.items[el], food: D.foods[el] };
}
function detailLuckyHTML(L) {
  const D = detailLang();
  return detailCard(`🍀 ${D.l.luck}`, `<div class="lucky"><div><small>${D.l.color}</small><b><span class="dot" style="background:${L.hex}"></span>${L.color}</b></div><div><small>${D.l.number}</small><b>${L.number}</b></div><div><small>${D.l.direction}</small><b>${L.direction}</b></div><div><small>${D.l.time}</small><b>${L.time}</b></div><div><small>${D.l.item}</small><b>${L.item}</b></div><div><small>${D.l.food}</small><b>${L.food}</b></div></div>`);
}
function detailCatsHTML(levels) {
  const D = detailLang(), names = [D.l.love, D.l.money, D.l.work, D.l.health], icons = ['💗', '💰', '📚', '🍀'];
  return detailCard(`📊 ${D.l.areas}`, levels.map((lv, i) => `<div class="cat"><div class="row"><span>${icons[i]} ${names[i]}</span>${starsHTML(lv)}</div><p>${lang().bands[lv - 1]}</p></div>`).join(''));
}
function detailActionsHTML(group) {
  const D = detailLang(), i = detailRelationIndex(group);
  return detailCard(`✅ ${D.l.good}`, `<ul class="dl good"><li>${D.good[i]}</li></ul><h3 style="margin-top:12px">⛔ ${D.l.avoid}</h3><ul class="dl bad"><li>${D.bad[i]}</li></ul>`);
}
function detailHead(title, subtitle, score, label) { return `<div class="res-head"><div class="lbl">${subtitle}</div><h2 class="serif">${title}</h2>${ringHTML(score, label || detailLang().l.score)}</div>`; }
function detailBasis() { const D = detailLang(); return detailCard(`ℹ️ ${D.l.calc}`, `<p>${D.l.entertainment}</p>`, 'calc-note'); }

function detailDaily(p, now, source) {
  const D = detailLang(), T = terms(), A = analyzeSaju(p), s = A.s, [y, m, d] = now, gz = dayPillar(y, m, d);
  const R = scoreFor(p, s, gz, `day-${y}-${m}-${d}`, A.yong), ri = detailRelationIndex(TEN_GODS[R.tg].group);
  const cats = catLevels(R.tg, R.score, R.r).map(x => x.lv);
  const slots = [8, 12, 16, 20].map((h, i) => { const hb = Math.floor(((h * 60 + 60) % 1440) / 120), hs = mod((gz.s % 5) * 2 + hb, 10), tg = tenGod(s.me, hs); return { l: D.times[i], t: D.relation[detailRelationIndex(TEN_GODS[tg].group)], d: '', v: starsHTML(lvOf(clamp(Math.round((R.score + TEN_GODS[tg].base) / 2), 35, 97))) }; });
  const html = detailHead(menuText('daily')[0], `${localDate(y, m, d)} · ${gz.han}`, R.score)
    + detailCard(`🔮 ${D.l.energy}`, `<span class="tagline">${T.masters[s.me]} · ${T.elements[s.meEl]}</span><p>${D.relation[ri]}</p><p>${scoreBand(R.score)}</p>`)
    + detailCard(`⏰ ${D.l.timing}`, rowsHTML(slots)) + detailCatsHTML(cats) + detailActionsHTML(TEN_GODS[R.tg].group)
    + detailLuckyHTML(detailLucky(A, `${profileKey(p)}-${y}-${m}-${d}`)) + detailBasis();
  return { share: `${menuText('daily')[0]}: ${R.score}/100 — ${scoreBand(R.score)}`, html };
}

function detailWeekly(p, now) {
  const D = detailLang(), A = analyzeSaju(p), s = A.s, base = new Date(now[0], now[1] - 1, now[2]), off = (base.getDay() + 6) % 7, days = [], groups = {};
  for (let i = 0; i < 7; i++) { const dt = new Date(base); dt.setDate(base.getDate() - off + i); const y = dt.getFullYear(), m = dt.getMonth() + 1, d = dt.getDate(), R = scoreFor(p, s, dayPillar(y, m, d), `day-${y}-${m}-${d}`, A.yong), g = TEN_GODS[R.tg].group; groups[g] = (groups[g] || 0) + R.score; days.push({ l: terms().weekdays[dt.getDay()], v: R.score, date: `${m}/${d}`, g }); }
  const group = Object.keys(groups).sort((a, b) => groups[b] - groups[a])[0], score = Math.round(days.reduce((a, x) => a + x.v, 0) / 7), best = days.reduce((a, x) => x.v > a.v ? x : a), low = days.reduce((a, x) => x.v < a.v ? x : a);
  const html = detailHead(menuText('weekly')[0], `${days[0].date} – ${days[6].date}`, score, D.l.average)
    + detailCard(`🔮 ${D.l.energy}`, `<p>${D.relation[detailRelationIndex(group)]}</p><p>${scoreBand(score)}</p>`)
    + detailCard(`📅 ${D.l.periodFlow}`, `${barsHTML(days)}<p>${D.l.best}: <b>${best.l} ${best.date}</b> · ${D.l.caution}: <b>${low.l} ${low.date}</b></p>${rowsHTML(days.map(x => ({ l: x.l, t: x.date, d: D.relation[detailRelationIndex(x.g)], v: `<b class="sc">${x.v}</b>` })))}`)
    + detailCatsHTML(catLevels(Object.keys(TEN_GODS).find(k => TEN_GODS[k].group === group) || 'bigyeon', score, rngFor(profileKey(p), 'week-local')).map(x => x.lv))
    + detailActionsHTML(group) + detailLuckyHTML(detailLucky(A, profileKey(p) + 'week')) + detailBasis();
  return { share: `${menuText('weekly')[0]}: ${score}/100 — ${scoreBand(score)}`, html };
}

function detailMonthly(p, now) {
  const D = detailLang(), A = analyzeSaju(p), s = A.s, [y, m] = now, mp = yearMonthPillars(y, m, 20).month, R = scoreFor(p, s, mp, `month-${y}-${m}`, A.yong), group = TEN_GODS[R.tg].group;
  const phaseNames = [D.l.early, D.l.middle, D.l.late], phases = phaseNames.map((l, i) => { let sum = 0; for (let n = 1; n <= 10; n++) { const day = Math.min(i * 10 + n, new Date(y, m, 0).getDate()); sum += scoreFor(p, s, dayPillar(y, m, day), `day-${y}-${m}-${day}`, A.yong).score; } return { l, v: Math.round(sum / 10) }; });
  const html = detailHead(menuText('monthly')[0], new Intl.DateTimeFormat(localeTag(), { year: 'numeric', month: 'long' }).format(new Date(y, m - 1, 1)), R.score)
    + detailCard(`🔮 ${D.l.energy}`, `<span class="tagline">${mp.han} · ${terms().elements[STEM_EL[mp.s]]}</span><p>${D.relation[detailRelationIndex(group)]}</p><p>${scoreBand(R.score)}</p>`)
    + detailCard(`🗓️ ${D.l.periodFlow}`, `${barsHTML(phases)}${rowsHTML(phases.map(x => ({ l: x.l, t: scoreBand(x.v), d: '', v: `<b class="sc">${x.v}</b>` })))}`)
    + detailCatsHTML(catLevels(R.tg, R.score, R.r).map(x => x.lv)) + detailActionsHTML(group) + detailLuckyHTML(detailLucky(A, profileKey(p) + `month-${y}-${m}`)) + detailBasis();
  return { share: `${menuText('monthly')[0]}: ${R.score}/100 — ${scoreBand(R.score)}`, html };
}

function detailYearly(p, now) {
  const D = detailLang(), A = analyzeSaju(p), s = A.s, Y = yearTarget(now), yp = yearMonthPillars(Y, 6, 1).year, R = scoreFor(p, s, yp, `year-${Y}`, A.yong), group = TEN_GODS[R.tg].group, months = [];
  for (let m = 1; m <= 12; m++) { const mp = yearMonthPillars(Y, m, 20).month, mr = scoreFor(p, s, mp, `month-${Y}-${m}`, A.yong); months.push({ l: String(m), v: Math.round((mr.score + R.score) / 2), g: TEN_GODS[mr.tg].group, han: mp.han }); }
  const best = months.reduce((a, x) => x.v > a.v ? x : a), low = months.reduce((a, x) => x.v < a.v ? x : a), ageMonths = ageMonthsNow(p, [Y, 7, 1]), du = A.daeun.list.filter(x => x.totalMonths <= ageMonths).pop();
  const html = detailHead(menuText('yearly', { y: Y })[0], `${Y} · ${yp.han} · ${terms().animals[yp.b]}`, R.score)
    + detailCard(`🔮 ${D.l.thisYear}`, `<p>${D.relation[detailRelationIndex(group)]}</p><p>${scoreBand(R.score)}</p>`)
    + (du ? detailCard(`🌊 ${D.l.current}`, `<span class="tagline">${du.age}–${du.age + 9} · ${du.gz.han}</span><p>${D.relation[detailRelationIndex(TEN_GODS[du.tg].group)]}</p>`) : '')
    + detailCard(`📈 ${D.l.periodFlow}`, `${barsHTML(months)}<p>${D.l.best}: <b>${best.l}</b> · ${D.l.caution}: <b>${low.l}</b></p>${rowsHTML(months.map(x => ({ l: x.l, t: `${x.han} · ${scoreBand(x.v)}`, d: D.relation[detailRelationIndex(x.g)], v: `<b class="sc">${x.v}</b>` })))}`)
    + detailCatsHTML(catLevels(R.tg, R.score, R.r).map(x => x.lv)) + detailActionsHTML(group) + detailLuckyHTML(detailLucky(A, profileKey(p) + `year-${Y}`)) + detailBasis();
  return { share: `${menuText('yearly', { y: Y })[0]}: ${R.score}/100 — ${scoreBand(R.score)}`, html };
}

function detailSaju(p, now) {
  const D = detailLang(), T = terms(), A = analyzeSaju(p), s = A.s, cols = [[D.l.year, s.year], [D.l.month, s.month], [D.l.day, s.day], [D.l.hour, s.hour]], total = A.weightedCount.reduce((a, b) => a + b, 0), g = Object.keys(A.groups).reduce((a, b) => A.groups[b] > A.groups[a] ? b : a), gi = detailRelationIndex(g), si = detailStrengthIndex(A.strength), ageMonths = ageMonthsNow(p, now), cur = A.daeun.list.filter(x => x.totalMonths <= ageMonths).pop(), next = A.daeun.list.find(x => !cur || x.totalMonths > cur.totalMonths);
  const pillars = cols.map(([label, x]) => `<div style="text-align:center;flex:1"><small>${label}</small><b class="serif" style="display:block;font-size:26px">${x ? x.han : '—'}</b><span>${x ? T.elements[STEM_EL[x.s]] : D.l.unknownTime}</span></div>`).join('');
  const bars = A.weightedCount.map((v, i) => `<div class="r"><span class="n">${T.elements[i]}</span><span class="t"><i style="width:${Math.max(4, v / total * 100)}%;background:var(--el${i})"></i></span><span class="c">${v.toFixed(1)}</span></div>`).join('');
  const cycles = A.daeun.list.map(x => ({ l: `${x.age}`, t: `${x.gz.han} · ${T.elements[STEM_EL[x.gz.s]]}`, d: D.relation[detailRelationIndex(TEN_GODS[x.tg].group)], v: starsHTML(lvOf(x.score)) }));
  const html = `<div class="res-head"><div class="lbl">${esc(p.name)} · ${localDate(p.y, p.m, p.d, false)}</div><h2 class="serif">${menuText('saju')[0]}</h2><div style="font-size:54px">${DAY_MASTER[s.me].icon}</div><p><b>${T.masters[s.me]}</b> · ${T.elements[s.meEl]}</p></div>`
    + detailCard(`柱 ${D.l.pillars}`, `<div style="display:flex;gap:8px">${pillars}</div>`)
    + detailCard(`🌱 ${D.l.personality}`, `<h3>${D.l.dayMaster}: ${T.masters[s.me]}</h3><p>${D.element[s.meEl]}</p><p><b>${D.l.strength}:</b> ${D.strength[si]}</p><p><b>${D.l.watch}:</b> ${D.bad[gi]}</p>`)
    + detailCard(`☯️ ${D.l.elements}`, `<div class="elbars">${bars}</div><p><b>${D.l.balance}:</b> ${T.strength[si]}</p><p><b>${D.l.helpful}:</b> ${T.elements[A.yong]}</p>`)
    + detailCard(`🧭 ${D.l.theme}`, `<p>${D.relation[gi]}</p><p><b>${D.l.good}:</b> ${D.good[gi]}</p>`)
    + detailCard(`🌊 ${D.l.decade}`, `${rowsHTML(cycles)}${cur ? `<p><b>${D.l.current}:</b> ${cur.gz.han} · ${D.relation[detailRelationIndex(TEN_GODS[cur.tg].group)]}</p>` : ''}${next ? `<p><b>${D.l.next}:</b> ${next.gz.han} · ${D.relation[detailRelationIndex(TEN_GODS[next.tg].group)]}</p>` : ''}`)
    + detailLuckyHTML(detailLucky(A, profileKey(p) + 'saju')) + detailBasis();
  return { share: `${menuText('saju')[0]} · ${T.masters[s.me]} · ${s.year.han} ${s.month.han} ${s.day.han}`, html };
}

function detailZodiac(p, now) {
  const D = detailLang(), T = terms(), [y, m, d] = now, zi = zodiacOf(p.m, p.d), Z = ZODIAC[zi], R = zodiacScore(p, zi, y, m, d), elIndex = { wood: 0, fire: 1, earth: 2, air: 3, water: 4 }[Z.el] ?? ({ fire: 1, earth: 2, air: 3, water: 4 }[Z.el]), r = R.r;
  const mapEl = { fire: 1, earth: 2, air: 3, water: 4 }, ei = mapEl[Z.el], cats = [0, 1, 2, 3].map(() => clamp(Math.round(R.score / 20 + (r() - .5) * 1.4), 1, 5)), week = [];
  for (let i = -4; i <= 2; i++) { const dt = new Date(y, m - 1, d + i), z = zodiacScore(p, zi, dt.getFullYear(), dt.getMonth() + 1, dt.getDate()); week.push({ l: T.weekdays[dt.getDay()], v: z.score }); }
  const compatible = Z.el === 'fire' ? [4, 8] : Z.el === 'earth' ? [5, 9] : Z.el === 'air' ? [0, 6] : [3, 11];
  const html = detailHead(`${Z.sym} ${T.zodiac[zi]}`, localDate(y, m, d), R.score)
    + detailCard(`✨ ${D.l.overview}`, `<p>${scoreBand(R.score)}</p><p>${D.element[ei]}</p>`)
    + detailCard(`☀️ ${lang().result[8]}`, `<p>${ZODIAC[R.transit].sym} <b>${T.zodiac[R.transit]}</b> → ${Z.sym} ${T.zodiac[zi]}</p>`)
    + detailCatsHTML(cats) + detailCard(`📅 ${D.l.periodFlow}`, barsHTML(week))
    + detailCard(`♉ ${D.l.zodiacProfile}`, `<p><b>${D.l.loveStyle}:</b> ${D.element[ei]}</p><p><b>${D.l.career}:</b> ${D.good[ei]}</p><p><b>${D.l.moneyStyle}:</b> ${D.relation[ei]}</p><p><b>${D.l.healthSymbol}:</b> ${D.l.entertainment}</p><p><b>${D.l.best}:</b> ${compatible.map(i => `${ZODIAC[i].sym} ${T.zodiac[i]}`).join(' · ')}</p>`)
    + detailBasis();
  return { share: `${Z.sym} ${T.zodiac[zi]}: ${R.score}/100 — ${scoreBand(R.score)}`, html };
}

function detailCompat(p, q, source) {
  const D = detailLang(), T = terms(), score = detailScoreFrom(source), a = computeSaju(p), b = computeSaju(q), az = zodiacOf(p.m, p.d), bz = zodiacOf(q.m, q.d), idx = Math.max(0, Math.min(4, Math.ceil(score / 20) - 1));
  const relationIndex = detailRelationIndex(relation(a.meEl, b.meEl)), levels = [clamp(Math.round(score / 20), 1, 5), clamp(Math.round(score / 20 + (a.day.b === b.day.b ? 1 : 0)), 1, 5), clamp(Math.round(score / 20 + (ZODIAC[az].el === ZODIAC[bz].el ? 1 : 0)), 1, 5), clamp(Math.round(score / 20), 1, 5)];
  const html = detailHead(menuText('compat')[0], `${esc(p.name)} × ${esc(q.name)}`, score)
    + detailCard(`💞 ${D.l.compatibility}`, `<p>${D.compat[idx]}</p><p><b>${esc(p.name)}</b>: ${T.masters[a.me]} · ${ZODIAC[az].sym} ${T.zodiac[az]}</p><p><b>${esc(q.name)}</b>: ${T.masters[b.me]} · ${ZODIAC[bz].sym} ${T.zodiac[bz]}</p>`)
    + detailCatsHTML(levels)
    + detailCard(`☯️ ${D.l.elementRelation}`, `<p>${D.relation[Math.max(0, relationIndex)]}</p>`)
    + detailCard(`✨ ${D.l.zodiacRelation}`, `<p>${ZODIAC[az].sym} ${T.zodiac[az]} × ${ZODIAC[bz].sym} ${T.zodiac[bz]}</p><p>${D.element[{ fire: 1, earth: 2, air: 3, water: 4 }[ZODIAC[az].el]]}</p>`)
    + detailCard(`🐰 ${D.l.advice}`, `<p>${D.good[idx]}</p><p>${D.compat[idx]}</p>`) + detailBasis();
  return { share: `${menuText('compat')[0]}: ${score}/100 — ${D.compat[idx]}`, html };
}

function localizedDetailedResult(id, p, q, source) {
  if (locale === 'ko') return source;
  const now = typeof today === 'function' ? today() : [new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()];
  if (id === 'daily') return detailDaily(p, now, source);
  if (id === 'weekly') return detailWeekly(p, now, source);
  if (id === 'monthly') return detailMonthly(p, now, source);
  if (id === 'yearly') return detailYearly(p, now, source);
  if (id === 'saju') return detailSaju(p, now, source);
  if (id === 'zodiac') return detailZodiac(p, now, source);
  if (id === 'compat' && q) return detailCompat(p, q, source);
  return localizedResult(id, p, q, source);
}
