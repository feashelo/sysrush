// SysRush JavaRush-Style Curriculum - Quest 2: Linux Terminal, Packages, Permissions & Processes (Levels 6 - 11)
window.CURRICULUM_Q2 = [
  {
    "level": 6,
    "questId": "q_linux",
    "cost": 45,
    "title": "Иерархия Папок FHS и Три Потока Linux (stdin, stdout, stderr, |, >, >>, 2>&1, tee)",
    "shortDesc": "Три стандартных дескриптора процессов (0, 1, 2), водопроводная труба конвейера |, разница между > и >>, черная дыра /dev/null, тройник tee и полная карта каталогов FHS.",
    "blocks": [
      {
        "type": "step_head",
        "step": 1,
        "title": "Шаг 1. Три Священных Потока (0, 1, 2), Труба | и Поисковый Фильтр grep",
        "roadmap": "roadmap.sh: Standard Streams & Pipes"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "Здорово, боец! Забудь скучные академические талмуды из пыльных библиотек. Представь, что операционная система Linux — это грандиозная гидравлическая станция с мощными трубами, а каждый запущенный процесс — насос, через который непрерывно течёт поток байтов.<br/><br/>Когда ядро Linux порождает любой процесс (будь то банальный <code>ls</code>, веб-сервер <code>nginx</code> или тяжеленная база данных <code>postgres</code>), оно автоматически вручает ему <strong>три открытых водопроводных трубы</strong> — системных файловых дескриптора с номерами <strong>0, 1 и 2</strong>.<br/><br/>Если ты поймёшь, как эти три потока соединяются между собой через конвейеры и перенаправления, ты сможешь управлять серверами играючи, одной строкой Bash заменяя сотни строк медленного кода!"
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Анатомия трех стандартных потоков (Дескрипторы 0, 1, 2)</h4>\n  <p>В операционной системе Linux действует фундаментальный принцип Unix: <em>«Всё есть файл, а программы общаются потоками байтов»</em>. Чтобы программа могла получать ввод и выдавать результат, операционная система при старте процесса автоматически открывает для него три стандартных канала передачи данных (дескриптора):</p>\n  <ul>\n    <li><strong>Дескриптор 0 — <code>stdin</code> (Standard Input, стандартный ввод):</strong> Поток, из которого процесс ожидает входящие данные. По умолчанию он привязан к твоей клавиатуре. Когда ты запускаешь утилиту без аргументов и вводишь символы, программа считывает их именно из нулевого дескриптора.</li>\n    <li><strong>Дескриптор 1 — <code>stdout</code> (Standard Output, стандартный вывод):</strong> Поток, в который программа отправляет результаты своей <em>успешной</em> работы. По умолчанию он направлен на экран терминала. Когда ты вызываешь <code>echo \"Привет\"</code> или <code>ls -l</code>, строки летят в дескриптор 1.</li>\n    <li><strong>Дескриптор 2 — <code>stderr</code> (Standard Error, стандартный поток ошибок):</strong> Специальный аварийный канал для диагностических сообщений, предупреждений и критических ошибок (например, <code>Permission denied</code> или <code>No such file or directory</code>). По умолчанию он тоже выводится на экран терминала, <strong>но идёт по совершенно независимому проводу</strong>!</li>\n  </ul>\n  <p><strong>Зачем разработчики Unix разделили вывод на 1 и 2?</strong> Представь, что твой скрипт парсит миллион строк из базы данных и передаёт их дальше финансовому калькулятору. Если посреди потока чисел вдруг возникнет текстовая ошибка <em>«Диск переполнен»</em>, калькулятор подавится текстом и рухнет. Благодаря разделению потоков полезные данные текут по дескриптору 1, а ошибки по дескриптору 2 сразу видны администратору или пишутся в отдельный аварийный журнал!</p>\n</div>\n\n<div class=\"theory-section\">\n  <h4>2. Сантехнический конвейер: Вертикальная черта <code>|</code> (Pipe)</h4>\n  <p>Символ вертикальной черты <code>|</code> (пайп) соединяет две или более команд в непрерывный конвейер. Он берёт стандартный вывод <strong>stdout (дескриптор 1)</strong> левой команды и напрямую вливает его в стандартный ввод <strong>stdin (дескриптор 0)</strong> правой команды!</p>\n  <p>При этом данные передаются прямо в оперативной памяти через кольцевой буфер ядра (pipe buffer), не сохраняясь на жесткий диск во временные файлы. Это обеспечивает колоссальную скорость работы:</p>\n  <pre><code>cat /var/log/syslog | grep -i \"error\" | wc -l</code></pre>\n  <p>В этой цепочке утилита <code>cat</code> читает журнал, передаёт текст утилите <code>grep</code> для фильтрации, а найденные строки передаются утилите <code>wc</code>, которая подсчитывает их точное число. Никакого мусора на диске — чистая элегантность!</p>\n  <p><em>Внимание:</em> Обычный пайп <code>|</code> пересылает <strong>только поток stdout</strong>. Поток ошибок <code>stderr</code> через пайп не идёт — он пробивает трубу и вываливается прямо в твою консоль, если ты специально не перенаправишь его.</p>\n</div>\n\n<div class=\"theory-section\">\n  <h4>3. Утилита <code>grep</code>: Поисковый лазер сисадмина</h4>\n  <p>Название <code>grep</code> расшифровывается как <em>Global Regular Expression Print</em>. Это мощнейший инструмент фильтрации текста построчно. Базовый синтаксис: <code>grep [флаги] \"шаблон\" [файл]</code>.</p>\n  <p>Флаги, которые ты обязан знать на зубок для реальной работы и сдачи экзамена LPIC-1:</p>\n  <ul>\n    <li><code>-i</code> (<code>--ignore-case</code>): <strong>Игнорировать регистр букв</strong>. Шаблон <code>error</code> найдёт строки со словами <code>error</code>, <code>Error</code>, <code>ERROR</code> и даже <code>eRrOr</code>. Незаменимо при разборе логов разных приложений!</li>\n    <li><code>-v</code> (<code>--invert-match</code>): <strong>Инвертировать поиск</strong>. Выводит все строки, в которых <em>НЕТ</em> указанного шаблона. Идеально, чтобы отфильтровать шум: <code>cat log.txt | grep -v \"DEBUG\"</code> выбросит весь мусор уровня отладки.</li>\n    <li><code>-c</code> (<code>--count</code>): Вывести только количество строк, совпавших с шаблоном, вместо самих строк.</li>\n    <li><code>-n</code> (<code>--line-number</code>): Выводить номера строк в исходном файле рядом с найденным текстом.</li>\n  </ul>\n</div>\n"
      },
      {
        "type": "cmd_anatomy",
        "cmd": "grep ERROR /var/log/syslog > /root/errors.txt",
        "desc": "Фильтрует системный журнал по строке ERROR и сохраняет результат в файл отчёта /root/errors.txt",
        "output": "Nov 15 07:44:51 srv postgres[842]: ERROR: could not bind IPv6 socket: Address already in use",
        "notes": [
          "Перед работой с файлами всегда проверяй текущую директорию командой pwd",
          "0 = stdin (клавиатура/вход), 1 = stdout (успешный вывод), 2 = stderr (поток ошибок)",
          "Труба | соединяет дескриптор 1 левой команды с дескриптором 0 правой команды",
          "grep -i делает поиск регистронезависимым, а grep -v инвертирует совпадения",
          "Стрелка > сбрасывает вывод команды напрямую в файл на диске"
        ]
      },
      {
        "type": "task_ref",
        "taskId": "t6_e0"
      },
      {
        "type": "task_ref",
        "taskId": "t4_1"
      },
      {
        "type": "step_head",
        "step": 2,
        "title": "Шаг 2. Разветвитель Потоков: Тройник tee (tee и tee -a)",
        "roadmap": "roadmap.sh: Advanced Stream Splitting (tee)"
      },
      {
        "type": "dialog",
        "char": "diego",
        "text": "Представь типичную ситуацию сисадмина: на проде падает база данных PostgreSQL. Тебе нужно СРОЧНО видеть ошибки прямо своими глазами в консоли, но одновременно записать их в файл лога для отчёта разработчикам.<br/><br/>Если использовать обычное перенаправление <code>></code>, консоль замолчит — весь вывод уйдёт в файл вслепую. Если не перенаправлять — ничего не запишется на диск. Как быть? Вызывать утилиту-тройник <strong>tee</strong>!"
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Водопроводный тройник: Зачем нужна утилита <code>tee</code></h4>\n  <p>Утилита <code>tee</code> названа в честь T-образного водопроводного тройника (буква «T»). Она принимает входящий поток байтов из стандартного ввода <code>stdin</code> и одновременно дублирует его на два независимых направления:</p>\n  <ol>\n    <li>Передаёт данные дальше в стандартный вывод <strong>stdout</strong> (на твой экран или следующей команде в пайпе).</li>\n    <li>Записывает точную копию потока в указанный файл (или несколько файлов) на жестком диске.</li>\n  </ol>\n  <pre><code>grep postgres /var/log/syslog | tee /root/pg.log</code></pre>\n  <p>Эта команда отфильтрует системный журнал, покажет найденные строки PostgreSQL прямо в твоём окне терминала и параллельно создаст аккуратный файл <code>/root/pg.log</code> со всеми строками!</p>\n</div>\n\n<div class=\"theory-section\">\n  <h4>2. Флаг дозаписи: <code>tee -a</code> (Append)</h4>\n  <p>По умолчанию утилита <code>tee</code> перезаписывает указанный файл с нуля. Чтобы сохранить старые записи и дописать новые данные в конец файла, используй флаг <code><strong>-a</strong></code> (<code>--append</code>):</p>\n  <pre><code>echo \"Запуск проверки $(date)\" | tee -a /var/log/audit.log</code></pre>\n  <p><strong>Лайфхак сисадмина: Запись в защищённые файлы с sudo.</strong><br/>\n  Если обычный пользователь попытается сделать: <code>sudo echo \"nameserver 8.8.8.8\" > /etc/resolv.conf</code>, он получит обидное <em>«Permission denied»</em>! Почему? Потому что перенаправление <code>></code> выполняет сама командная оболочка непривилегированного пользователя, а не sudo. Спасает связка с <code>tee</code>:</p>\n  <pre><code>echo \"nameserver 8.8.8.8\" | sudo tee /etc/resolv.conf</code></pre>\n  <p>Утилита <code>tee</code> запускается от имени root через sudo и без проблем записывает поток в файл!</p>\n</div>\n"
      },
      {
        "type": "cmd_anatomy",
        "cmd": "grep postgres /var/log/syslog | tee /root/pg.log",
        "desc": "Фильтрует записи сервиса postgres из системного лога, выводя их на экран и одновременно записывая в файл /root/pg.log",
        "output": "Nov 15 07:44:51 srv postgres[842]: ERROR: could not bind IPv6 socket: Address already in use",
        "notes": [
          "tee принимает поток из stdin и направляет его одновременно в stdout и в файл",
          "Флаг tee -a (append) дописывает строки в конец файла без затирания",
          "tee незаменим для записи в защищённые root-файлы через связку с sudo"
        ]
      },
      {
        "type": "task_ref",
        "taskId": "t4_5"
      },
      {
        "type": "step_head",
        "step": 3,
        "title": "Шаг 3. Операторы Перенаправления: Опасный >, Бережный >>, Чёрная Дыра /dev/null и Секрет Порядка 2>&1",
        "roadmap": "roadmap.sh: I/O Redirection & Order of Execution"
      },
      {
        "type": "dialog",
        "char": "kira",
        "text": "Внимание! Запомни навсегда: перепутать <code>></code> и <code>>></code> в боевой консоли — всё равно что уронить боевую БД в пятницу вечером!<br/><br/>Одиночная стрелка <code>></code> — это <strong>Truncate (обнуление до 0 байт)</strong>. Прежде чем записать хотя бы один символ, Bash мгновенно стирает всё прежнее содержимое файла.<br/><br/>А в знаменитой конструкции <code>> app.log 2>&1</code> важен строгий порядок слева направо. Поменяешь местами — и все ошибки вывалятся на экран, а не в файл!"
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Стрелка перезаписи <code>></code> (Overwrite / Truncate) против <code>>></code> (Append)</h4>\n  <ul>\n    <li><code><strong>></strong></code> (Truncate): Направляет <code>stdout</code> в файл. <strong>Если файл существовал, оболочка мгновенно стирает его до 0 байт!</strong><br/>\n      <em>Хитрость сисадмина:</em> Чтобы мгновенно обнулить разросшийся лог на 50 ГБ без перезапуска сервиса, выполни: <code>: > /var/log/nginx/access.log</code>.\n    </li>\n    <li><code><strong>>></strong></code> (Append): Открывает файл в режиме <em>дозаписи</em>. Старые данные не трогаются, новые строки аккуратно пристыковываются в самый конец документа.</li>\n  </ul>\n</div>\n\n<div class=\"theory-section\">\n  <h4>2. Укрощение ошибок: Перенаправление <code>2></code> и чёрная дыра <code>/dev/null</code></h4>\n  <p>Сообщения об ошибках текут по независимому дескриптору <strong>2 (stderr)</strong>. Их можно изолировать цифрой <code>2></code>:</p>\n  <ul>\n    <li><code>find / -name \"*.conf\" 2> /tmp/errors.txt</code> — сложит ошибки в файл, оставив консоль чистой.</li>\n    <li><code>find / -name \"*.conf\" 2> /dev/null</code> — направит поток ошибок в <strong>/dev/null</strong>.</li>\n  </ul>\n  <p><strong>/dev/null</strong> — специальное виртуальное псевдоустройство ядра («чёрная дыра» Linux). Любые данные, записанные в <code>/dev/null</code>, бесследно исчезают из системы со скоростью света, не занимая ни байта на диске.</p>\n</div>\n\n<div class=\"theory-section\">\n  <h4>3. Слияние потоков: Почему пишут строго <code>> app.log 2>&1</code>, а не наоборот?</h4>\n  <p>Когда мы настраиваем задание cron или фоновый бэкап, мы хотим собрать в единый журнал и успешный вывод, и ошибки: <code>./backup.sh > app.log 2>&1</code>.</p>\n  <p>Давай проследим работу командного интерпретатора Bash слева направо:</p>\n  <ol>\n    <li>Сначала Bash встречает <code>> app.log</code> — он открывает файл <code>app.log</code> и привязывает к нему <strong>дескриптор 1 (stdout)</strong>.</li>\n    <li>Затем Bash встречает <code>2>&1</code> — он видит команду: <em>«Направь дескриптор 2 туда же, куда СЕЙЧАС указывает дескриптор 1»</em>. Так как дескриптор 1 уже направлен в <code>app.log</code>, дескриптор 2 тоже направляется в <code>app.log</code>! Всё работает идеально.</li>\n  </ol>\n  <p><strong>А что будет, если написать наоборот: <code>./backup.sh 2>&1 > app.log</code>?</strong></p>\n  <p>Произойдёт классическая катастрофа! Сначала выполнится <code>2>&1</code>: в этот момент дескриптор 1 ещё привязан к экрану терминала, поэтому дескриптор 2 тоже привяжется к терминалу. Затем <code>> app.log</code> отправит только дескриптор 1 в файл. В итоге: успешные логи запишутся в файл, а <strong>все ошибки повалятся прямо в терминал!</strong></p>\n  <p><em>Современное сокращение в Bash:</em> команда <code>&> app.log</code> делает то же самое, направляя оба потока в файл.</p>\n</div>\n"
      },
      {
        "type": "diagram",
        "text": "\n  СХЕМА ПЕРЕНАПРАВЛЕНИЯ ПОТОКОВ В LINUX:\n  ===========================================================================\n  [Клавиатура] ─── дескриптор 0 (stdin)  ───> [ ПРОЦЕСС ]\n                                                    │\n             ┌──────────────────────────────────────┴─────────────────────────────────┐\n             ▼                                                                        ▼\n   дескриптор 1 (stdout)                                                    дескриптор 2 (stderr)\n   [Успешные данные]                                                        [Сообщения об ошибках]\n             │                                                                        │\n     ┌───────┴────────┐                                                       ┌───────┴────────┐\n     ▼                ▼                                                       ▼                ▼\n  [ > файл ]     [ >> файл ]                                             [ 2> err.log ]  [ 2> /dev/null ]\n(Перезапись)    (Дозапись в хвост)                                      (В файл ошибок)  (В чёрную дыру!)\n     │                │                                                       │\n     └────────────────┼───────────────────────┬───────────────────────────────┘\n                      ▼                       ▼\n            [ > log.txt 2>&1 ]      [ &> log.txt ]   <── ОБА ПОТОКА СЛИТЫ В ОДИН ФАЙЛ!\n  ===========================================================================\n"
      },
      {
        "type": "task_ref",
        "taskId": "t4_2"
      },
      {
        "type": "task_ref",
        "taskId": "t4_6"
      },
      {
        "type": "step_head",
        "step": 4,
        "title": "Шаг 4. Стандарт Иерархии Каталогов FHS: Архитектура Системы",
        "roadmap": "roadmap.sh: Filesystem Hierarchy Standard (FHS)"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "В отличие от Windows с разрозненными дисками <code>C:</code>, <code>D:</code>, файловая система Linux — это единое стройное дерево с корнем <code><strong>/</strong></code> (root).<br/><br/>Стандарт <strong>Filesystem Hierarchy Standard (FHS)</strong> строго регламентирует, что и где должно лежать. Разложишь файлы неправильно — система не загрузится после аварии или переполнит системный раздел. Запоминай главные каталоги!"
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Главные каталоги стандарта FHS и их назначение:</h4>\n  <ul>\n    <li><code><strong>/etc</strong></code> (Host-specific system configuration files):<br/>\n      <strong>Главная папка настроек операционной системы и служб!</strong> Здесь лежат конфиги учетных записей (<code>/etc/passwd</code>), сети (<code>/etc/hosts</code>, <code>/etc/resolv.conf</code>), веб-серверов (<code>/etc/nginx/</code>) и таблица дисков (<code>/etc/fstab</code>).<br/>\n      <em>Правило FHS:</em> в <code>/etc</code> хранятся <strong>ТОЛЬКО статические конфигурационные файлы</strong>; бинарных исполняемых файлов здесь быть не должно!\n    </li>\n    <li><code><strong>/var</strong></code> (Variable files):<br/>\n      Каталог для данных, которые непрерывно изменяются и растут в размерах во время нормальной работы системы:\n      <ul>\n        <li><code>/var/log</code> — системные журналы и логи приложений.</li>\n        <li><code>/var/lib</code> — постоянные состояния пакетов и базы данных (например, таблицы PostgreSQL или MySQL).</li>\n        <li><code>/var/spool</code> — очереди печати принтеров, отложенные задачи cron и очереди писем.</li>\n      </ul>\n    </li>\n    <li><code><strong>/proc</strong></code> (Kernel Virtual Filesystem):<br/>\n      Псевдо-файловая система, создаваемая ядром непосредственно в оперативной памяти (RAM). На физическом диске она занимает ровно 0 байт! Это живые датчики и ручки управления ядром Linux: <code>/proc/cpuinfo</code>, <code>/proc/meminfo</code>, <code>/proc/version</code>.\n    </li>\n    <li><code><strong>/opt</strong></code> (Optional Application Software Packages):<br/>\n      Каталог для установки стороннего проприетарного или монолитного программного обеспечения, которое ставится единым независимым каталогом со своими собственными библиотеками: Google Chrome, GitLab, IntelliJ IDEA, 1C:Предприятие.\n    </li>\n    <li><code><strong>/bin</strong></code> и <code><strong>/sbin</strong></code>: Каталоги базовых утилит (ls, cp, bash) и системных команд администратора (reboot, fdisk, ip). В современных дистрибутивах они объединены как симлинки на <code>/usr/bin</code> и <code>/usr/sbin</code>.</li>\n    <li><code><strong>/home</strong></code> и <code><strong>/root</strong></code>: Домашние папки обычных пользователей (<code>/home/diego</code>) и отдельный изолированный дом суперпользователя <code><strong>/root</strong></code> прямо в корневой ФС (чтобы root мог восстановить сервер, даже если раздел <code>/home</code> повреждён).</li>\n    <li><code><strong>/tmp</strong></code>: Каталог для временных файлов. Доступен на запись всем, очищается при перезагрузке.</li>\n    <li><code><strong>/dev</strong></code>: Файлы блочных и символьных устройств (диски <code>/dev/sda</code>, генератор чисел <code>/dev/urandom</code>, черная дыра <code>/dev/null</code>).</li>\n  </ul>\n</div>\n"
      },
      {
        "type": "task_ref",
        "taskId": "t4_4"
      },
      {
        "type": "step_head",
        "step": 5,
        "title": "Шаг 5. Экзаменационный Рубеж FHS на LPIC-1 [104.7] & Словарь Терминов",
        "roadmap": "LPIC-1 Exam Prep [104.7]"
      },
      {
        "type": "dialog",
        "char": "smith",
        "text": "Тема 104.7 экзамена LPIC-1 требует безошибочного знания стандарта FHS. В тесте тебя попросят впечатать путь к системным конфигурационным файлам без подсказок. Закрепляем термины на английском!"
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Чек-лист правильных ответов экзамена LPIC-1 (Тема 104.7):</h4>\n  <ul>\n    <li><strong>Вопрос:</strong> Which top-level directory stores host-specific system configuration files?<br/>\n      <strong>Ответ:</strong> <code>/etc</code> (или <code>/etc/</code>).\n    </li>\n    <li><strong>Вопрос:</strong> Where are variable data files like logs, databases, and spool queues stored?<br/>\n      <strong>Ответ:</strong> <code>/var</code>.\n    </li>\n    <li><strong>Вопрос:</strong> Which directory contains virtual files representing kernel and process states in memory?<br/>\n      <strong>Ответ:</strong> <code>/proc</code>.\n    </li>\n    <li><strong>Вопрос:</strong> Where is optional add-on software installed?<br/>\n      <strong>Ответ:</strong> <code>/opt</code>.\n    </li>\n  </ul>\n</div>\n"
      },
      {
        "type": "vocab"
      },
      {
        "type": "task_ref",
        "taskId": "t4_3"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "Внимание, боевая тревога на продакшене! На базе данных PostgreSQL произошёл критический инцидент: логи забиты ошибками сокетов, а мониторинг ослеп. Твоя задача уровня 120%: отфильтруй критические ошибки <code>grep ERROR</code> из <code>/var/log/syslog</code> в файл <code>/root/errors.txt</code>, затем через тройник <code>tee</code> перехвати поток сообщений базы данных <code>grep postgres /var/log/syslog | tee /root/pg.log</code> и сразу проверь результат утилитой <code>cat /root/pg.log</code>. Покажи класс настоящего сисадмина!"
      },
      {
        "type": "task_ref",
        "taskId": "t6_boss"
      }
    ],
    "vocab": [
      {
        "en": "standard streams",
        "pron": "[ста́ндарт стримз]",
        "ru": "стандартные потоки ввода-вывода (0 stdin, 1 stdout, 2 stderr)",
        "assoc": "Каждый процесс в Linux рождается с тремя открытыми каналами связи"
      },
      {
        "en": "redirection",
        "pron": "[редире́кшн]",
        "ru": "перенаправление потоков данных (символы >, >>, <, 2>)",
        "assoc": "Позволяет пересылать вывод программ в файлы или считывать входные данные из файлов"
      },
      {
        "en": "append",
        "pron": "[аппе́нд]",
        "ru": "дописать в конец файла (оператор >>)",
        "assoc": "В отличие от одиночной стрелки >, двойная >> бережно сохраняет старые строки файла"
      },
      {
        "en": "tee",
        "pron": "[ти́]",
        "ru": "тройник / разветвитель потока (утилита tee)",
        "assoc": "Раздваивает поток: отправляет данные и в файл на диске, и в терминал"
      },
      {
        "en": "directory",
        "pron": "[дире́ктори]",
        "ru": "каталог / папка файловой системы",
        "assoc": "В стандартах POSIX и Linux папки всегда официально именуются directory"
      },
      {
        "en": "configuration",
        "pron": "[конфигюрэ́йшн]",
        "ru": "конфигурация / файлы настроек системы (каталог /etc)",
        "assoc": "Согласно FHS, каталог /etc хранит host-specific system configuration files"
      },
      {
        "en": "variable",
        "pron": "[вэ́риэбл]",
        "ru": "переменный / постоянно меняющийся (каталог /var)",
        "assoc": "В каталоге /var живут непрерывно растущие логи, очереди печати и базы данных"
      }
    ],
    "tasks": [
      {
        "id": "t6_e0",
        "type": "builder",
        "title": "Экспресс-разминка: Номера потоков и символ трубы |",
        "matter": 10,
        "difficulty": "easy",
        "char": "batya",
        "story": "Перед боевой практикой давай за 3 секунды зафиксируем базу: вспомни номера дескрипторов и символ конвейера Linux!",
        "fields": [
          {
            "id": "stderr_fd",
            "label": "Номер дескриптора стандартного потока ошибок (stderr):",
            "options": [
              {
                "val": "0",
                "label": "0 (stdin — ввод)"
              },
              {
                "val": "1",
                "label": "1 (stdout — нормальный вывод)"
              },
              {
                "val": "2",
                "label": "2 (stderr — поток ошибок)"
              },
              {
                "val": "3",
                "label": "3 (произвольный дескриптор)"
              }
            ],
            "correct": "2"
          },
          {
            "id": "pipe_sym",
            "label": "Символ конвейера (пайплайна) для передачи stdout в stdin следующей утилиты:",
            "options": [
              {
                "val": "pipe",
                "label": "| (вертикальная черта — pipe)"
              },
              {
                "val": "gt",
                "label": "> (перенаправление в файл)"
              },
              {
                "val": "amp",
                "label": "& (фоновый режим)"
              },
              {
                "val": "semi",
                "label": "; (последовательный запуск)"
              }
            ],
            "correct": "pipe"
          }
        ],
        "requirements": [
          "Укажи номер дескриптора потока ошибок `stderr`.",
          "Выбери символ для построения конвейера между командами."
        ],
        "hint": "stderr — это поток номер 2, а конвейер строится символом вертикальной черты `|`!"
      },
      {
        "id": "t4_1",
        "type": "terminal",
        "title": "Охотник за логами: вылови ошибку ERROR и сохрани отчёт",
        "matter": 25,
        "char": "diego",
        "story": "Сервер сбоит! В системном журнале `/var/log/syslog` затерялась критическая строка со словом `ERROR`. Вылови её через `grep` и сохрани в файл `/root/errors.txt`!",
        "requirements": [
          "Проверь текущую рабочую папку командой `pwd`.",
          "Отфильтруй строки со словом `ERROR` из `/var/log/syslog` через `grep`.",
          "Сохрани найденную строку с `ERROR` в файл `/root/errors.txt` с помощью перенаправления `>`."
        ],
        "chips": [
          "pwd",
          "cat /var/log/syslog",
          "grep ERROR /var/log/syslog",
          "grep ERROR /var/log/syslog > /root/errors.txt",
          "cat /root/errors.txt"
        ],
        "hint": "Выполни в терминале `pwd`, затем `grep ERROR /var/log/syslog > /root/errors.txt` и жми «✅ Проверка»!",
        "checkRules": [
          "cmd:pwd",
          "cmd:grep",
          "file_has:/root/errors.txt:ERROR"
        ],
        "difficulty": "medium"
      },
      {
        "id": "t4_5",
        "type": "terminal",
        "title": "Разветвитель логов: вылови postgres через tee в файл и консоль",
        "matter": 15,
        "char": "diego",
        "story": "В системном журнале `/var/log/syslog` зафиксированы ошибки сервиса `postgres`. Пропусти лог через тройник `tee`: выведи строки на экран и одновременно сохрани их в `/root/pg.log`!",
        "requirements": [
          "Отфильтруй строки со словом `postgres` из `/var/log/syslog` через `grep`.",
          "Одновременно выведи их на экран и сохрани в `/root/pg.log` с помощью утилиты `tee` (`grep postgres /var/log/syslog | tee /root/pg.log`).",
          "Проверь содержимое сохранённого файла командой `cat /root/pg.log`."
        ],
        "chips": [
          "grep postgres /var/log/syslog | tee /root/pg.log",
          "cat /root/pg.log",
          "clear"
        ],
        "hint": "Выполни `grep postgres /var/log/syslog | tee /root/pg.log`, затем `cat /root/pg.log` и жми «✅ Проверка»!",
        "checkRules": [
          "cmd:tee",
          "file_has:/root/pg.log:postgres"
        ],
        "difficulty": "easy"
      },
      {
        "id": "t4_2",
        "type": "lpic_en",
        "title": "Тренажёр LPIC-1 [103.4]: Redirection (> vs >>)",
        "matter": 20,
        "char": "smith",
        "story": "Внимательно посмотри на глагол `appends` (дописывает в конец, НЕ стирая старое содержимое)!",
        "enQuestion": "<w k='which'>Which</w> redirection <w k='operator'>operator</w> <w k='appends'>appends</w> the <w k='standard'>standard</w> <w k='output'>output</w> of a <w k='command'>command</w> to an existing <w k='file'>file</w> <w k='without'>without</w> overwriting its contents?",
        "options": [
          {
            "val": "a",
            "text": ">"
          },
          {
            "val": "b",
            "text": ">>"
          },
          {
            "val": "c",
            "text": "|"
          },
          {
            "val": "d",
            "text": "2>"
          }
        ],
        "correct": "b",
        "explainRu": "Чётко! Одиночный `>` стирает файл (overwrites), а двойной `>>` бережно дописывает в конец (appends).",
        "requirements": [
          "Переведи слова `appends` и `without`.",
          "Выбери оператор дозаписи в конец файла."
        ],
        "hint": "Две стрелки `>>` = дописать в конец (append)!",
        "difficulty": "easy"
      },
      {
        "id": "t4_6",
        "type": "builder",
        "title": "Инженерный Пульт: Перенаправление > vs >> и Секрет Порядка 2>&1",
        "matter": 15,
        "char": "kira",
        "story": "Перед запуском скрипта на проде настрой правильные режимы записи в файл и направление потоков ошибок!",
        "requirements": [
          "Определи, что произойдёт при использовании одиночной стрелки `>` вместо двойной `>>`.",
          "Объясни, почему конструкцию слияния пишут строго как `> app.log 2>&1`, а не наоборот."
        ],
        "fields": [
          {
            "id": "trunc_vs_append",
            "label": "1. В чём ключевая опасность одиночного оператора `>` по сравнению с `>>`?",
            "options": [
              {
                "val": "truncate",
                "text": "Оператор > мгновенно обнуляет (стирает) файл до 0 байт перед записью, а >> дописывает в хвост"
              },
              {
                "val": "append_only",
                "text": "Оператор > дописывает строки в начало файла"
              }
            ],
            "correct": "truncate"
          },
          {
            "id": "order_2_to_1",
            "label": "2. Почему в команде `cmd > app.log 2>&1` перенаправление дескриптора 2 пишут ПОСЛЕ файла лога?",
            "options": [
              {
                "val": "after_stdout",
                "text": "Сначала дескриптор 1 направляется в app.log, а затем 2>&1 копирует адрес файла из 1 во 2. При обратном порядке ошибки полетят на экран!"
              },
              {
                "val": "syntax_only",
                "text": "Bash читает команды справа налево, поэтому порядок не имеет значения"
              }
            ],
            "correct": "after_stdout"
          }
        ],
        "hint": "Одиночный `>` стирает файл до 0 байт, а в связке дескриптор 1 направляют в файл ДО того, как во 2 копируют его адрес!",
        "difficulty": "easy"
      },
      {
        "id": "t4_4",
        "type": "builder",
        "title": "Архитектурный Стенд: Распределение Файлов по Стандарту FHS",
        "matter": 20,
        "char": "batya",
        "story": "Разложи системные компоненты строго по предписаниям Filesystem Hierarchy Standard (FHS)!",
        "requirements": [
          "Назначь правильный каталог для глобальных файлов конфигурации служб.",
          "Определи место для постоянно растущих логов и данных баз данных.",
          "Выбери псевдо-файловую систему ядра в оперативной памяти (RAM).",
          "Укажи папку для изолированной установки стороннего софта (Google Chrome, 1C)."
        ],
        "fields": [
          {
            "id": "fhs_etc",
            "label": "1. Где по стандарту FHS обязаны храниться статические файлы конфигурации операционной системы и служб (nginx, sshd, fstab)?",
            "options": [
              {
                "val": "etc",
                "text": "/etc — Host-specific system configuration files (только статические конфиги)"
              },
              {
                "val": "var",
                "text": "/var — папка конфигураций"
              },
              {
                "val": "usr_bin",
                "text": "/usr/bin — настройки бинарников"
              }
            ],
            "correct": "etc"
          },
          {
            "id": "fhs_var",
            "label": "2. В какую директорию система складывает непрерывно меняющиеся данные: логи (/var/log), очереди и базы данных?",
            "options": [
              {
                "val": "opt",
                "text": "/opt — динамические данные"
              },
              {
                "val": "var",
                "text": "/var (Variable files) — системные журналы, базы данных и spool"
              },
              {
                "val": "tmp",
                "text": "/tmp — постоянные логи"
              }
            ],
            "correct": "var"
          },
          {
            "id": "fhs_proc",
            "label": "3. Какой каталог является виртуальной ФС ядра в памяти RAM (не занимает места на диске) и содержит /proc/cpuinfo и /proc/meminfo?",
            "options": [
              {
                "val": "proc",
                "text": "/proc — виртуальная файловая система ядра и параметров процессов в RAM"
              },
              {
                "val": "sys_disk",
                "text": "/sys — единственный каталог ядра на жестком диске"
              },
              {
                "val": "dev",
                "text": "/dev — виртуальная память CPU"
              }
            ],
            "correct": "proc"
          },
          {
            "id": "fhs_opt",
            "label": "4. Куда принято устанавливать монолитные сторонние пакеты софта (GitLab, Chrome, IntelliJ IDEA), содержащие свои собственные библиотеки?",
            "options": [
              {
                "val": "opt",
                "text": "/opt (Optional Application Software Packages) — стороннее проприетарное ПО"
              },
              {
                "val": "sbin",
                "text": "/sbin — пользовательские программы"
              },
              {
                "val": "root",
                "text": "/root — рабочий стол администратора"
              }
            ],
            "correct": "opt"
          }
        ],
        "hint": "Конфиги живут в `/etc`, растущие логи в `/var`, виртуальные датчики ядра в `/proc`, сторонний софт в `/opt`!",
        "difficulty": "medium"
      },
      {
        "id": "t4_3",
        "type": "lpic_fill",
        "title": "Ввод ответа LPIC-1 [104.7]: Главная папка конфигов FHS",
        "matter": 20,
        "char": "smith",
        "story": "Ещё один реальный fill-in-the-blank вопрос с LPIC-1: впиши путь к корневой папке системных настроек!",
        "enQuestion": "According to the Filesystem Hierarchy <w k='standard'>Standard</w> (FHS), <w k='which'>which</w> top-level <w k='directory'>directory</w> <w k='stores'>stores</w> host-specific <w k='system'>system</w> <w k='configuration'>configuration</w> <w k='files'>files</w>? (<w k='specify'>Specify</w> the <w k='full'>full</w> <w k='path'>path</w>.)",
        "acceptedAnswers": [
          "/etc",
          "/etc/"
        ],
        "placeholder": "Например: /var",
        "explainRu": "Идеально! Все общесистемные конфигурационные файлы в Linux хранятся в `/etc`.",
        "requirements": [
          "Вспомни, какая папка в корне `/` отвечает за `system configuration files`.",
          "Впиши полный путь к ней."
        ],
        "hint": "Четыре символа: `/etc`!",
        "difficulty": "easy"
      },
      {
        "id": "t6_boss",
        "type": "terminal",
        "title": "БОСС 120%: Локализация аварии PostgreSQL и тройник tee",
        "matter": 40,
        "difficulty": "hard",
        "char": "batya",
        "story": "Сервер приложений потерял связь с базой данных PostgreSQL! Журнал переполнен событиями. Проведи экстренное расследование инцидента: изолируй аварийные сообщения и организуй дублирующий канал записи логов.",
        "requirements": [
          "Локализуй системный сбой: отфильтруй строки критических ошибок `ERROR` из журнала `/var/log/syslog` и сохрани их в аварийный файл `/root/errors.txt`.",
          "Организуй параллельный мониторинг: выдели события сервиса `postgres` из `/var/log/syslog` через тройник `tee`, сохранив копию в `/root/pg.log` с одновременным выводом на экран.",
          "Проверь целостность сформированного отчёта базы данных, просмотрев содержимое файла `/root/pg.log`."
        ],
        "chips": [
          "grep ERROR /var/log/syslog > /root/errors.txt",
          "grep postgres /var/log/syslog | tee /root/pg.log",
          "cat /root/pg.log"
        ],
        "checkRules": [
          "file_has:/root/errors.txt:ERROR",
          "cmd:tee",
          "file_has:/root/pg.log:postgres",
          "cmd:cat /root/pg.log"
        ],
        "hint": "Выполни в терминале: 1) `grep ERROR /var/log/syslog > /root/errors.txt`, 2) `grep postgres /var/log/syslog | tee /root/pg.log`, 3) `cat /root/pg.log` и жми «✅ Проверка»!"
      }
    ]
  },
  {
    "level": 7,
    "questId": "q_linux",
    "cost": 45,
    "title": "Архивы tar, Умный Поиск find и Фильтры Лога (head, tail -f, wc -l, Регулярки grep)",
    "shortDesc": "Железная мнемоника ключей tar (czvf / xzvf), умный поиск файлов find по размеру и дате, живое чтение tail -f и регулярные выражения ^, $, . в grep.",
    "blocks": [
      {
        "type": "step_head",
        "step": 1,
        "title": "Шаг 1. Архиватор tar (Мнемоника czvf), Чтение Логов (head, tail -f) и Подсчёт Строк wc -l",
        "roadmap": "roadmap.sh: Archiving & Text Inspection"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "Каждый второй джуниор на собеседовании краснеет и мнётся при вопросе: «Как упаковать папку утилитой tar?». Они признаются: <em>«Батя, я каждый раз лезу в Google за флагами!»</em>.<br/><br/>Забудь этот позор раз и навсегда! Сейчас я дам тебе железную мнемонику, которая намертво въестся в подкорку твоего мозга:<br/><strong>c-z-v-f</strong> = <strong>Create + gZip + Verbose + File</strong>!<br/><br/>Давай разберём архивацию и скоростной просмотр системных логов от А до Я."
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Великий и ужасный архиватор <code>tar</code> (Tape Archive)</h4>\n  <p>Исторически утилита <code>tar</code> была создана в 1970-х годах для записи резервных копий на магнитные ленты. В отличие от zip-архивов в Windows, сам по себе чистый <code>tar</code> <strong>НЕ сжимает файлы</strong> — он лишь склеивает тысячи разрозненных файлов в один непрерывный монолитный файл-рулон (archive), бережно сохраняя все права доступа, владельцев и временные метки.</p>\n  <p>Чтобы сжать получившийся рулон, к нему на лету подключают алгоритмы компрессии (обычно <code>gzip</code>). Получается сжатый архив с расширением <code>.tar.gz</code> (или сокращенно <code>.tgz</code>).</p>\n</div>\n\n<div class=\"theory-section\">\n  <h4>2. Железная мнемоника создания архива: <code>tar -czvf</code></h4>\n  <p>Запоминаем каждую букву как отдельное английское слово:</p>\n  <ul>\n    <li><code><strong>c</strong></code> — <strong>Create</strong> (создать новый архив с нуля).</li>\n    <li><code><strong>z</strong></code> — <strong>gZip</strong> (пропустить созданный поток через алгоритм сжатия gzip — получится архив <code>.tar.gz</code>).</li>\n    <li><code><strong>v</strong></code> — <strong>Verbose</strong> (подробный режим: выводить на экран список всех файлов, которые утилита прямо сейчас пакует).</li>\n    <li><code><strong>f</strong></code> — <strong>File</strong> (указать имя файла архива!).</li>\n  </ul>\n  <p><strong>ЖЕЛЕЗНОЕ ПРАВИЛО LPIC-1:</strong> Флаг <code>-f</code> <strong>ОБЯЗАН стоять последним</strong> в группе ключей непосредственно перед именем архива: <code>tar -czvf /root/backup.tar.gz /etc</code>. Аргумент сразу после <code>f</code> воспринимается как имя файла!</p>\n</div>\n\n<div class=\"theory-section\">\n  <h4>3. Скоростная инспекция текстовых файлов: <code>head</code>, <code>tail</code> и <code>wc -l</code></h4>\n  <ul>\n    <li><code><strong>head -n 10 file.txt</strong></code> (шапка): Быстро выводит первые 10 строк с самого начала файла.</li>\n    <li><code><strong>tail -n 10 file.txt</strong></code> (хвост): Быстро выводит последние 10 строк с самого конца файла.</li>\n    <li><code><strong>tail -f /var/log/syslog</strong></code> (Follow, режим живого эфира):<br/>\n      <strong>Главное оружие сисадмина при расследовании аварий!</strong> Терминал замирает и в реальном времени отображает каждую новую строчку, которую сервисы дописывают в конец лога прямо сейчас. Выход: <code>Ctrl + C</code>.\n    </li>\n    <li><code><strong>wc -l file.txt</strong></code> (Word Count — Lines): Выводит точное количество строк (lines) в указанном файле или потоке.</li>\n  </ul>\n</div>\n"
      },
      {
        "type": "cmd_anatomy",
        "cmd": "tar -czvf /root/etc-backup.tar.gz /etc && wc -l /var/log/syslog",
        "desc": "Упаковывает системную конфигурацию /etc в сжатый архив /root/etc-backup.tar.gz и подсчитывает точное количество строк в системном журнале",
        "output": "tar: Removing leading '/' from member names\n/etc/\n/etc/passwd\n/etc/shadow\n4 /var/log/syslog",
        "notes": [
          "c = create (создать), z = gzip (сжатие), v = verbose (подробно), f = file (имя файла)",
          "Флаг f всегда ставится последним перед именем файла архива!",
          "tail -f держит файл открытым и показывает свежие записи лога в реальном времени",
          "wc -l возвращает точное количество строк (lines) в указанном файле или потоке"
        ]
      },
      {
        "type": "task_ref",
        "taskId": "t7_e0"
      },
      {
        "type": "task_ref",
        "taskId": "t7_1"
      },
      {
        "type": "step_head",
        "step": 2,
        "title": "Шаг 2. Распаковка tar (xzvf, -C, bzip2, xz) и Поисковый Комбайн find",
        "roadmap": "roadmap.sh: File Search & Extraction"
      },
      {
        "type": "dialog",
        "char": "diego",
        "text": "Распаковать архив? Проще простого: заменяем букву <code>c</code> (create) на букву <code>x</code> (<strong>eXtract</strong> — извлечь)! Получаем <code>tar -xzvf archive.tar.gz</code>.<br/><br/>А если диск сервера забит на 99% и всё вот-вот рухнет — мы зовём тяжелую артиллерию: комбайн <code>find</code>! Он найдёт любого жирного монстра по размеру, дате изменения или расширению за считанные секунды!"
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Распаковка и инспекция: Команды <code>tar -xzvf</code>, <code>tar -tf</code> и ключ <code>-C</code></h4>\n  <p>Чтобы извлечь файлы из архива <code>.tar.gz</code>, используем команду:</p>\n  <pre><code>tar -xzvf archive.tar.gz</code></pre>\n  <p>Буква <code><strong>x</strong></code> означает <strong>eXtract</strong> (извлечь/распаковать). По умолчанию файлы распакуются прямо в текущую папку.</p>\n  <p><strong>Как распаковать архив в другую папку?</strong> Используй специальный ключ <code><strong>-C /путь/к/папке</strong></code> (Change Directory):</p>\n  <pre><code>tar -xzvf app-v2.tar.gz -C /opt/myproject/</code></pre>\n  <p><strong>Просмотр оглавления без распаковки:</strong> Чтобы заглянуть внутрь архива и увидеть список файлов, не распаковывая его на диск, используй ключ <code><strong>-t</strong></code> (table of contents):</p>\n  <pre><code>tar -tf backup.tar.gz</code></pre>\n</div>\n\n<div class=\"theory-section\">\n  <h4>2. Форматы сжатия на экзамене LPIC-1 (Тема 103.3): <code>gzip</code>, <code>bzip2</code> и <code>xz</code></h4>\n  <ul>\n    <li><code><strong>-z</strong></code> — <strong>gzip</strong>: Расширение <code>.tar.gz</code> или <code>.tgz</code>. Самый популярный стандарт: быстро сжимает, требует мало RAM. Команда распаковки: <code>tar -xzvf file.tar.gz</code>.</li>\n    <li><code><strong>-j</strong></code> (строчная j!) — <strong>bzip2</strong>: Расширение <code>.tar.bz2</code>. Сжимает сильнее, чем gzip, но медленнее. Команда распаковки: <code>tar -xjvf file.tar.bz2</code>.</li>\n    <li><code><strong>-J</strong></code> (заглавная J!) — <strong>xz</strong>: Расширение <code>.tar.xz</code>. Экстремальное сжатие дистрибутивов Linux (на базе LZMA2). Команда распаковки: <code>tar -xJvf file.tar.xz</code>.</li>\n  </ul>\n</div>\n\n<div class=\"theory-section\">\n  <h4>3. Поисковый комбайн <code>find</code>: Знаки <code>+</code> и <code>-</code></h4>\n  <p>Утилита <code>find</code> сканирует файловую систему в реальном времени. Синтаксис: <code>find [где] [критерии] [действие]</code>.</p>\n  <ul>\n    <li><strong>По размеру файла (флаг <code>-size</code>):</strong>\n      <ul>\n        <li><code>find /var/log -size +100M</code> — знак <code>+</code> означает строго <strong>БОЛЬШЕ 100 Мегабайт</strong>!</li>\n        <li><code>find /tmp -size -10k</code> — знак <code>-</code> означает строго <strong>МЕНЬШЕ 10 Килобайт</strong>.</li>\n      </ul>\n    </li>\n    <li><strong>По времени изменения (флаг <code>-mtime</code> в днях):</strong>\n      <ul>\n        <li><code>find /var/log -mtime -7</code> — файлы, которые изменялись <strong>МЕНЬШЕ 7 дней назад</strong> (то есть за последнюю неделю!).</li>\n        <li><code>find /var/log -mtime +30</code> — файлы, которые изменялись <strong>БОЛЕЕ 30 дней назад</strong> (старые архивы).</li>\n      </ul>\n    </li>\n    <li><strong>По типу объекта (флаг <code>-type</code>):</strong> <code>-type f</code> (файлы), <code>-type d</code> (каталоги), <code>-type l</code> (символические ссылки).</li>\n  </ul>\n</div>\n"
      },
      {
        "type": "diagram",
        "text": "\n  ШПАРГАЛКА LPIC-1 ПО АРХИВАТОРАМ И СЖАТИЮ (ТЕМА 103.3):\n  =============================================================================\n  Действие      │ Флаг │ Пример команды\n  ──────────────┼──────┼──────────────────────────────────────────────────────\n  Создать архив │  -c  │ tar -czvf backup.tar.gz /etc\n  Извлечь файлы │  -x  │ tar -xzvf backup.tar.gz -C /tmp/restore\n  Список файлов │  -t  │ tar -tf backup.tar.gz\n  ──────────────┼──────┼──────────────────────────────────────────────────────\n  Алгоритм      │ Флаг │ Расширение │ Свойства\n  ──────────────┼──────┼────────────┼─────────────────────────────────────────\n  gzip          │  -z  │ .tar.gz    │ Быстрый, низкая нагрузка на CPU\n  bzip2         │  -j  │ .tar.bz2   │ Высокая степень сжатия, медленнее\n  xz            │  -J  │ .tar.xz    │ Экстремальное сжатие дистрибутивов\n  =============================================================================\n"
      },
      {
        "type": "task_ref",
        "taskId": "t7_2"
      },
      {
        "type": "task_ref",
        "taskId": "t7_4"
      },
      {
        "type": "step_head",
        "step": 3,
        "title": "Шаг 3. Регулярные Выражения в grep и Фильтрация Конфигов: Инверсия grep -v",
        "roadmap": "LPIC-1 Exam Prep [103.7] & Production Filters"
      },
      {
        "type": "dialog",
        "char": "smith",
        "text": "Тема 103.7 экзамена LPIC-1 посвящена регулярным выражениям (<strong>Regular Expressions / Regex</strong>). Администратор, не владеющий регулярками, тратит часы на ручную прокрутку конфигов.<br/><br/>В любом файле настроек Linux (например, <code>/etc/ssh/sshd_config</code>) сотни строк заняты комментариями, начинающимися со знака <code>#</code>. Чтобы вывести только рабочие директивы, используется инвертированный поиск <code>grep -v</code>!"
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Инвертированный поиск: Флаг <code>grep -v</code> (<code>--invert-match</code>)</h4>\n  <p>Обычный <code>grep</code> выводит строки, совпавшие с шаблоном. Флаг <code><strong>-v</strong></code> (<code>--invert-match</code>) полностью переворачивает логику:</p>\n  <ul>\n    <li>Он отбрасывает все совпавшие строки.</li>\n    <li><strong>Выводит ТОЛЬКО те строки, в которых НЕТ указанного шаблона!</strong></li>\n  </ul>\n  <p>Например, чтобы просмотреть настройки без комментариев, начинающихся с <code>#</code>:</p>\n  <pre><code>grep -v '^#' /etc/ssh/sshd_config</code></pre>\n  <p>А связка <code>grep -v 'DEBUG' app.log</code> мгновенно выбросит весь отладочный мусор из журнала!</p>\n</div>\n\n<div class=\"theory-section\">\n  <h4>2. Символы-якоря: Крышечка <code>^</code> и Доллар <code>$</code></h4>\n  <p>Якоря привязывают поиск к границам строки:</p>\n  <ul>\n    <li><code><strong>^</strong></code> (каретка / крышечка): <strong>Якорь начала строки</strong>.<br/>\n      Команда <code>grep '^root' /etc/passwd</code> найдёт ТОЛЬКО те строки, которые <em>НАЧИНАЮТСЯ</em> со слова <code>root</code>. Если слово <code>root</code> встретится в середине строки, она будет отброшена!\n    </li>\n    <li><code><strong>$</strong></code> (знак доллара): <strong>Якорь конца строки</strong>.<br/>\n      Команда <code>grep 'bash$' /etc/passwd</code> найдёт строки, которые <em>ЗАКАНЧИВАЮТСЯ</em> на слово <code>bash</code>.\n    </li>\n    <li><code><strong>^$</strong></code> (пустая строка): Строка, где сразу за началом идёт конец.</li>\n    <li><code><strong>.</strong></code> (точка): Заменяет ровно один любой символ.</li>\n    <li><code><strong>*</strong></code> (звёздочка): Ноль или более повторений предыдущего символа.</li>\n  </ul>\n</div>\n"
      },
      {
        "type": "task_ref",
        "taskId": "t7_5"
      },
      {
        "type": "step_head",
        "step": 4,
        "title": "Шаг 4. Экзаменационный Тренажёр LPIC-1 [103.7] & Словарь Терминов",
        "roadmap": "LPIC-1 Exam Prep [103.7]"
      },
      {
        "type": "dialog",
        "char": "smith",
        "text": "На экзамене LPIC-1 авторы тестов обожают проверять знание якорей начала и конца строк. Внимательно читай условия вопроса на английском!"
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Чек-лист правильных ответов экзамена LPIC-1 (Тема 103.7):</h4>\n  <ul>\n    <li><strong>Lines starting with word:</strong> <code>grep '^word' file</code> (якорь <code>^</code>).</li>\n    <li><strong>Lines ending with word:</strong> <code>grep 'word$' file</code> (якорь <code>$</code>).</li>\n    <li><strong>Exclude comments / invert match:</strong> <code>grep -v</code> (флаг <code>-v</code> или <code>--invert-match</code>).</li>\n    <li><strong>Extended regular expressions:</strong> <code>grep -E</code> (или <code>egrep</code>).</li>\n  </ul>\n</div>\n"
      },
      {
        "type": "vocab"
      },
      {
        "type": "task_ref",
        "taskId": "t7_3"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "Боец, объявляю учения 120%: аудит и аварийная эвакуация инфраструктуры! Перед плановыми работами админ обязан упаковать все конфиги в сжатый архив <code>tar -czvf /root/etc-backup.tar.gz /etc</code>, провести ревизию всех журналов в каталоге командой <code>find /var/log -name \"*.log\"</code> и точно посчитать строки в системном логе утилитой <code>wc -l /var/log/syslog</code>. Покажи чистую работу без суеты!"
      },
      {
        "type": "task_ref",
        "taskId": "t7_boss"
      }
    ],
    "vocab": [
      {
        "en": "archive",
        "pron": "[а́ркайв]",
        "ru": "архив / упакованный монолитный файл (утилита tar)",
        "assoc": "Утилита tar объединяет множество файлов в единый непрерывный архивный файл"
      },
      {
        "en": "compress / extract",
        "pron": "[компрэ́с / экстрэ́кт]",
        "ru": "сжимать (флаг -c / -z) / извлекать, распаковывать (флаг -x)",
        "assoc": "На экзамене LPIC-1 глагол extracts прямо указывает на ключ -x команды tar"
      },
      {
        "en": "verbose",
        "pron": "[вэ́рбоус]",
        "ru": "подробный режим отображения операций (ключ -v)",
        "assoc": "Флаг -v выводит детальный список каждого упаковываемого или распаковываемого файла"
      },
      {
        "en": "invert match",
        "pron": "[инвё́рт мэтч]",
        "ru": "инвертированное совпадение (ключ -v в grep)",
        "assoc": "Флаг -v выводит строки, которые НЕ содержат указанный шаблон (исключение комментариев)"
      },
      {
        "en": "line / lines",
        "pron": "[лайн / лайнз]",
        "ru": "строка / строки текстового документа",
        "assoc": "Якоря ^ и $ привязывают регулярные выражения к началу и концу строки (line)"
      },
      {
        "en": "expression",
        "pron": "[экспрэ́шн]",
        "ru": "выражение (Regular Expression — регулярное выражение / regex)",
        "assoc": "Тема 103.7 экзамена LPIC-1 проверяет знание синтаксиса регулярных выражений"
      }
    ],
    "tasks": [
      {
        "id": "t7_e0",
        "type": "builder",
        "title": "Экспресс-разминка: Мнемоника tar -czvf и подсчёт строк wc -l",
        "matter": 10,
        "difficulty": "easy",
        "char": "batya",
        "story": "Перед тем как паковать серверные бэкапы, освежи в памяти золотые ключи утилит tar и wc!",
        "fields": [
          {
            "id": "tar_create_flag",
            "label": "Ключ утилиты tar для СОЗДАНИЯ нового архива (create):",
            "options": [
              {
                "val": "c",
                "label": "-c (Create — создать новый архив)"
              },
              {
                "val": "x",
                "label": "-x (Extract — извлечь из архива)"
              },
              {
                "val": "t",
                "label": "-t (Table of contents — список файлов)"
              },
              {
                "val": "d",
                "label": "-d (Diff — сравнить архив с диском)"
              }
            ],
            "correct": "c"
          },
          {
            "id": "wc_lines_flag",
            "label": "Ключ утилиты wc для подсчёта количества СТРОК (lines) в файле:",
            "options": [
              {
                "val": "l",
                "label": "-l (подсчёт строк — lines)"
              },
              {
                "val": "w",
                "label": "-w (подсчёт слов — words)"
              },
              {
                "val": "c",
                "label": "-c (подсчёт байт — bytes)"
              },
              {
                "val": "m",
                "label": "-m (подсчёт символов — characters)"
              }
            ],
            "correct": "l"
          }
        ],
        "requirements": [
          "Выбери ключ `tar` для создания нового архива.",
          "Укажи флаг команды `wc` для подсчёта строк."
        ],
        "hint": "Создание архива — ключ `-c`, а подсчёт строк — ключ `-l` (lines)!"
      },
      {
        "id": "t7_1",
        "type": "terminal",
        "title": "Бэкап конфигов и подсчёт строк системного журнала",
        "matter": 30,
        "char": "diego",
        "story": "Перед обновлением сервера упакуй всю папку `/etc` в сжатый архив `/root/etc-backup.tar.gz`, а затем посчитай точное количество строк в журнале `/var/log/syslog` командой `wc -l`!",
        "requirements": [
          "Создай сжатый архив `/root/etc-backup.tar.gz` из папки `/etc` (`tar -czvf /root/etc-backup.tar.gz /etc`).",
          "Посчитай количество строк в файле `/var/log/syslog` командой `wc -l /var/log/syslog`.",
          "Впиши полученное число строк из `/var/log/syslog` в поле ответа."
        ],
        "chips": [
          "tar -czvf /root/etc-backup.tar.gz /etc",
          "ls -l",
          "wc -l /var/log/syslog",
          "tail -n 2 /var/log/syslog"
        ],
        "answerLabel": "Сколько строк в файле /var/log/syslog (по выводу wc -l)?",
        "answerPlaceholder": "Например: 10",
        "expectedAnswer": "4",
        "hint": "Выполни `tar -czvf /root/etc-backup.tar.gz /etc`, затем `wc -l /var/log/syslog` — увидишь `4 /var/log/syslog`. Впиши `4`!",
        "checkRules": [
          "archive:/root/etc-backup.tar.gz",
          "cmd:wc -l",
          "ans:4"
        ],
        "difficulty": "medium"
      },
      {
        "id": "t7_2",
        "type": "lpic_en",
        "title": "Тренажёр LPIC-1 [103.3]: Распаковка .tar.gz архива",
        "matter": 20,
        "char": "smith",
        "story": "Проверяем нашу железную мнемонику `eXtract Ze Vucking File`!",
        "enQuestion": "<w k='which'>Which</w> <w k='command'>command</w> <w k='extracts'>extracts</w> the contents of a gzip-<w k='compressed'>compressed</w> tar <w k='archive'>archive</w> named `logs.tar.gz`?",
        "options": [
          {
            "val": "a",
            "text": "tar -czvf logs.tar.gz"
          },
          {
            "val": "b",
            "text": "tar -xzvf logs.tar.gz"
          },
          {
            "val": "c",
            "text": "gzip -c logs.tar.gz"
          },
          {
            "val": "d",
            "text": "tar -fcz logs.tar.gz"
          }
        ],
        "correct": "b",
        "explainRu": "Точно! `-x` = eXtract (распаковать), `-z` = gzip, `-v` = verbose, `-f` = file (и флаг `f` всегда стоит непосредственно перед именем файла!).",
        "requirements": [
          "Обрати внимание на глагол `extracts` (извлекает/распаковывает).",
          "Выбери правильную комбинацию ключей `tar`."
        ],
        "hint": "`extracts` -> буква `x` -> `tar -xzvf logs.tar.gz`!",
        "difficulty": "easy"
      },
      {
        "id": "t7_4",
        "type": "builder",
        "title": "Инженерный Пульт: Ключи tar и Логика Знаков в Поиске find",
        "matter": 20,
        "char": "batya",
        "story": "Перед автоматизацией ночных бэкапов выбери безошибочные ключи архиватора tar и условия поиска find!",
        "requirements": [
          "Выбери режим просмотра оглавления архива без распаковки на диск.",
          "Определи флаг алгоритма экстремального сжатия xz (.tar.xz).",
          "Расшифруй знак `+` в параметре `find /var/log -size +100M`.",
          "Укажи, как найти файлы, изменённые за последнюю неделю (меньше 7 дней назад)."
        ],
        "fields": [
          {
            "id": "tar_inspect",
            "label": "1. Какой ключ команды `tar` позволяет посмотреть список файлов внутри архива (Table of Contents) БЕЗ извлечения на диск?",
            "options": [
              {
                "val": "t",
                "text": "-t (например, tar -tf backup.tar.gz)"
              },
              {
                "val": "c",
                "text": "-c (Create archive)"
              },
              {
                "val": "x",
                "text": "-x (Extract files)"
              }
            ],
            "correct": "t"
          },
          {
            "id": "tar_compress_xz",
            "label": "2. Какой ключ задаёт максимальное сжатие алгоритмом xz для получения архива `.tar.xz`?",
            "options": [
              {
                "val": "cap_j",
                "text": "-J (заглавная буква J: tar -cJvf archive.tar.xz)"
              },
              {
                "val": "small_z",
                "text": "-z (gzip: tar.gz)"
              },
              {
                "val": "small_j",
                "text": "-j (bzip2: tar.bz2)"
              }
            ],
            "correct": "cap_j"
          },
          {
            "id": "find_size_sign",
            "label": "3. Что означает знак плюс `+` в условии команды `find /var/log -size +100M`?",
            "options": [
              {
                "val": "greater",
                "text": "Искать файлы строго БОЛЬШЕ 100 Мегабайт"
              },
              {
                "val": "exact",
                "text": "Искать файлы ровно 100 Мегабайт"
              },
              {
                "val": "less",
                "text": "Искать файлы меньше 100 Мегабайт"
              }
            ],
            "correct": "greater"
          },
          {
            "id": "find_mtime_sign",
            "label": "4. Какое условие в find выберет файлы, которые модифицировались за последние 7 дней (меньше 7 дней назад)?",
            "options": [
              {
                "val": "minus_7",
                "text": "-mtime -7 (знак минус означает «меньше чем 7 дней назад»)"
              },
              {
                "val": "plus_7",
                "text": "-mtime +7 (файлы старше 7 дней)"
              },
              {
                "val": "exact_7",
                "text": "-mtime 7 (ровно на 7-й день)"
              }
            ],
            "correct": "minus_7"
          }
        ],
        "hint": "Просмотр без распаковки — это `-t`, сжатие xz — `-J`, знак `+` — больше, а `-7` — за последние 7 дней!",
        "difficulty": "medium"
      },
      {
        "id": "t7_5",
        "type": "lpic_fill",
        "title": "Ввод ответа LPIC-1 [103.7]: Инвертированный поиск в grep",
        "matter": 15,
        "char": "smith",
        "story": "Реальный экзаменационный вопрос LPIC-1 по теме 103.7: отфильтруй строки без комментариев!",
        "enQuestion": "<w k='which'>Which</w> `grep` flag or <w k='command'>command</w> performs an <w k='invert'>invert</w> <w k='match'>match</w> (prints <w k='only'>only</w> the <w k='lines'>lines</w> that do NOT <w k='match'>match</w> the pattern, such as excluding comments)? (<w k='specify'>Specify</w> the flag or `grep` <w k='command'>command</w>.)",
        "acceptedAnswers": [
          "grep -v",
          "-v",
          "--invert-match"
        ],
        "placeholder": "Например: -v",
        "explainRu": "Браво! Ключ `-v` (`--invert-match`) инвертирует совпадения в `grep`: строки с шаблоном отбрасываются, а выводятся только строки БЕЗ него.",
        "requirements": [
          "Вспомни ключ утилиты `grep`, отвечающий за `invert match`.",
          "Введи флаг `-v` или команду `grep -v`."
        ],
        "hint": "Ключ инверсии — `-v` (invert-match)!",
        "difficulty": "easy"
      },
      {
        "id": "t7_3",
        "type": "lpic_en",
        "title": "Тренажёр LPIC-1 [103.7]: Регулярные выражения (Начало строки ^)",
        "matter": 20,
        "char": "smith",
        "story": "Ещё один стопроцентный хит экзамена LPIC-1 по `grep`!",
        "enQuestion": "<w k='which'>Which</w> `grep` <w k='command'>command</w> <w k='prints'>prints</w> <w k='only'>only</w> the <w k='lines'>lines</w> in `/etc/passwd` that start with the word `root`?",
        "options": [
          {
            "val": "a",
            "text": "grep 'root$' /etc/passwd"
          },
          {
            "val": "b",
            "text": "grep '^root' /etc/passwd"
          },
          {
            "val": "c",
            "text": "grep '*root' /etc/passwd"
          },
          {
            "val": "d",
            "text": "grep -v 'root' /etc/passwd"
          }
        ],
        "correct": "b",
        "explainRu": "Квест 2 продолжается на ура! Крышка домика `^` — это якорь начала строки (`^root`), а знак доллара `$` — якорь конца строки (`bash$`).",
        "requirements": [
          "Найди в вопросе условие `start with` (начинаются с...).",
          "Выбери якорь начала строки в регулярных выражениях."
        ],
        "hint": "Начало строки = крышечка `^` -> `grep '^root' /etc/passwd`!",
        "difficulty": "easy"
      },
      {
        "id": "t7_boss",
        "type": "terminal",
        "title": "БОСС 120%: Полный бэкап /etc, ревизия логов find и аудит строк wc",
        "matter": 40,
        "difficulty": "hard",
        "char": "batya",
        "story": "Сервер готовится к переходу на новый дистрибутив. Руководство требует заархивировать конфигурацию системы, составить список активных журналов и предоставить контрольную сумму объёма логов.",
        "requirements": [
          "Создай сжатый gzip-архив системных конфигураций всего каталога `/etc` в файл `/root/etc-backup.tar.gz`.",
          "Проведи ревизию файловой системы: найди все файлы журналов в каталоге `/var/log` с расширением `.log`.",
          "Выполни подсчёт строк в системном журнале `/var/log/syslog`.",
          "Введи итоговое количество строк системного журнала в поле ответа."
        ],
        "chips": [
          "tar -czvf /root/etc-backup.tar.gz /etc",
          "find /var/log -name \"*.log\"",
          "wc -l /var/log/syslog"
        ],
        "expectedAnswer": "4",
        "answerLabel": "Число строк в /var/log/syslog:",
        "answerPlaceholder": "Например: 4",
        "checkRules": [
          "archive:/root/etc-backup.tar.gz",
          "cmd:find /var/log",
          "cmd:wc -l /var/log/syslog",
          "ans:4"
        ],
        "hint": "Выполни в терминале: `tar -czvf /root/etc-backup.tar.gz /etc`, затем `find /var/log -name \"*.log\"` и `wc -l /var/log/syslog` — увидишь `4 /var/log/syslog`. Впиши `4` в поле ответа и жми «✅ Проверка»!"
      }
    ]
  },
  {
    "level": 8,
    "questId": "q_linux",
    "cost": 50,
    "title": "Текстовые Комбайны Консоли: cut, sort, uniq, tr, sed и awk",
    "shortDesc": "Нарезка файлов по колонкам cut, сортировка sort, смертельная ловушка uniq -c, замена символов tr, потоковый редактор sed и швейцарский нож awk.",
    "blocks": [
      {
        "type": "step_head",
        "step": 1,
        "title": "Шаг 1. Нарезка Колонками через cut, Сортировка sort и Ловушка uniq -c",
        "roadmap": "roadmap.sh: Text Processing Tools"
      },
      {
        "type": "dialog",
        "char": "diego",
        "text": "В операционных системах Linux текст — это универсальный протокол передачи данных. Практически все системные базы данных хранятся в виде обычных табличных текстовых файлов: <code>/etc/passwd</code> разбит двоеточиями, веб-логи Nginx разбиты пробелами, CSV-отчёты — запятыми.<br/><br/>Зачем писать громоздкие скрипты на Python для парсинга, если встроенные консольные комбайны Unix обработают гигабайты логов за полсекунды прямо в терминале? Сегодня осваиваем святую троицу: <strong>cut</strong>, <strong>sort</strong> и <strong>uniq</strong>!"
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Утилита <code>cut</code>: Ножницы сисадмина для нарезки колонок</h4>\n  <p>Команда <code>cut</code> разрезает каждую входящую строку текста на отдельные фрагменты (поля) по заданному разделителю и извлекает только нужные тебе столбцы.</p>\n  <ul>\n    <li><code><strong>-d</strong></code> (<code>--delimiter</code>): <strong>Символ-разделитель полей</strong>. По умолчанию разделителем считается знак табуляции (Tab). Но для <code>/etc/passwd</code> разделитель — двоеточие: <code>-d:</code>. Для CSV — запятая: <code>-d,</code>.</li>\n    <li><code><strong>-f</strong></code> (<code>--fields</code>): <strong>Номера извлекаемых колонок (полей)</strong>:\n      <ul>\n        <li><code>-f1</code> — вывести только первую колонку.</li>\n        <li><code>-f1,3,7</code> — вывести 1-ю, 3-ю и 7-ю колонку.</li>\n        <li><code>-f2-5</code> — вывести диапазон столбцов со 2-го по 5-й.</li>\n      </ul>\n    </li>\n  </ul>\n  <pre><code>cut -d: -f1 /etc/passwd</code></pre>\n</div>\n\n<div class=\"theory-section\">\n  <h4>2. Утилита <code>sort</code>: Сортировка строк и чисел</h4>\n  <ul>\n    <li><strong>По умолчанию (без флагов):</strong> Сортирует лексикографически (по алфавиту ASCII). Числа сортируются как слова (список 1, 10, 2 останется неверным!).</li>\n    <li><code><strong>-n</strong></code> (<code>--numeric-sort</code>): <strong>Числовая сортировка</strong>. Сравнивает значения как математические числа (2 встанет перед 10).</li>\n    <li><code><strong>-r</strong></code> (<code>--reverse</code>): <strong>Обратный порядок</strong> — от большего к меньшему.</li>\n    <li><code><strong>-k</strong></code> (<code>--key</code>): Сортировка по номеру столбца (например, <code>sort -k2 -n</code>).</li>\n  </ul>\n</div>\n\n<div class=\"theory-section\">\n  <h4>3. Утилита <code>uniq</code> и её главная ловушка на собеседованиях</h4>\n  <p>Утилита <code>uniq</code> фильтрует повторяющиеся строки. Её флаг <code><strong>-c</strong></code> (<code>--count</code>) подсчитывает количество повторений каждой строки.</p>\n  <p><strong>ГЛАВНАЯ СМЕРТЕЛЬНАЯ ЛОВУШКА LPIC-1:</strong><br/>\n  Почему команда <code>uniq access.log</code> часто не удаляет дубликаты?<br/>\n  Потому что утилита <code>uniq</code> <strong>сравнивает ТОЛЬКО СОСЕДНИЕ, ИДУЩИЕ ПОДРЯД СТРОКИ (adjacent / consecutive lines)!</strong></p>\n  <p>Если одинаковые строки разбросаны в разных концах файла, <code>uniq</code> их не склеит. Именно поэтому в 99.9% случаев <code>uniq</code> ставят <strong>в связке ПОСЛЕ утилиты sort</strong>:</p>\n  <pre><code>sort access.log | uniq -c</code></pre>\n</div>\n"
      },
      {
        "type": "cmd_anatomy",
        "cmd": "awk '{print $1}' /var/log/access.log | sort | uniq -c",
        "desc": "Извлекает первый столбец лога (IP-адреса клиентов), группирует одинаковые адреса с помощью sort и подсчитывает частоту запросов каждого IP через uniq -c",
        "output": "      1 10.0.0.1\n      1 192.168.1.50\n      3 185.220.101.9",
        "notes": [
          "cut -d: -f1 режет строку по символу двоеточия и извлекает только 1-е поле",
          "sort расставляет одинаковые элементы в файле строго друг за другом",
          "uniq -c вычисляет количество повторов только для соседних строк (adjacent lines)",
          "Связка sort | uniq -c — золотой стандарт расследования сетевых DDoS-атак и аномалий"
        ]
      },
      {
        "type": "task_ref",
        "taskId": "t8_e0"
      },
      {
        "type": "task_ref",
        "taskId": "t8n_1"
      },
      {
        "type": "step_head",
        "step": 2,
        "title": "Шаг 2. Выбор Инструмента: Строгий cut, Гибкий awk, Сортировка и Транслятор tr",
        "roadmap": "roadmap.sh: Text Processing Strategies"
      },
      {
        "type": "dialog",
        "char": "kira",
        "text": "Когда джуниору дают задачу распарсить лог, он теряется: где брать <code>cut</code>, а где <code>awk</code>? Почему <code>cut</code> пасует перед пробелами в логах, а <code>tr</code> читает только из <code>stdin</code>?<br/><br/>Давай чётко разложим, какой комбайн доставать под конкретную боевую задачу!"
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Когда брать <code>cut -d: -f1</code>, а когда <code>awk '{print $1}'</code>?</h4>\n  <ul>\n    <li><code><strong>cut</strong></code> — идеален для файлов с <strong>строгим одиночным разделителем</strong> (двоеточие в <code>/etc/passwd</code>, запятая в <code>data.csv</code>, слеш в путях). Но если между словами встретится два пробела подряд, <code>cut -d' '</code> воспримет второй пробел как пустую колонку и всё сломается!</li>\n    <li><code><strong>awk</strong></code> — идеален для логов и системных таблиц (<code>ps aux</code>, логи веб-сервера), где между колонками <strong>плавающее количество пробелов и табуляций</strong>! Выражение <code>awk '{print $1}'</code> автоматически сжимает любые серии пробелов в один разделитель и безошибочно возвращает 1-е слово.</li>\n  </ul>\n</div>\n\n<div class=\"theory-section\">\n  <h4>2. Почему <code>uniq -c</code> обязан идти ПОСЛЕ <code>sort</code>?</h4>\n  <p>Утилита <code>uniq</code> хранит в буфере только ОДНУ предыдущую строку. Она не строит хэш-таблицу в памяти. Если дубликат встретится через 10 строк, <code>uniq</code> уже забыл о нём! Команда <code>sort</code> расставляет все дубликаты вплотную друг к другу, гарантируя 100% точность подсчёта.</p>\n</div>\n\n<div class=\"theory-section\">\n  <h4>3. Скоростной конвертер символов: Утилита <code>tr</code></h4>\n  <p>Утилита <code>tr</code> (Translate) работает <strong>исключительно с потоком stdin</strong> (через пайп <code>|</code> или <code><</code>):</p>\n  <ul>\n    <li><strong>Смена регистра текста:</strong> <code>cat names.txt | tr 'a-z' 'A-Z'</code> — превращает все строчные буквы в заглавные.</li>\n    <li><strong>Удаление мусора (флаг <code>-d</code>):</strong> <code>tr -d '\\r' < script.sh > script_clean.sh</code> — удаляет виндовые символы возврата каретки (CRLF -> LF), избавляя от ошибки <em>«\\r: command not found»</em>.</li>\n  </ul>\n</div>\n"
      },
      {
        "type": "task_ref",
        "taskId": "t8n_5"
      },
      {
        "type": "step_head",
        "step": 3,
        "title": "Шаг 3. Потоковый Редактор sed: Замена на Лету sed -i в Боевых Конфигах",
        "roadmap": "roadmap.sh: Advanced Stream Editors (sed)"
      },
      {
        "type": "dialog",
        "char": "diego",
        "text": "Править конфиги вручную через текстовый редактор на сотнях серверов — прошлый век! Сисадмины используют потоковый редактор <strong>sed</strong>.<br/><br/>С флагом <strong>-i (in-place)</strong> утилита <code>sed</code> мгновенно меняет директивы прямо в файле на диске. Сейчас мы переведём порт SSH со стандартного 22 на защищённый 2222 одной строкой!"
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Анатомия потокового редактора <code>sed</code> (Stream Editor)</h4>\n  <p>Утилита <code>sed</code> считывает текст построчно, применяет правила замены по регулярным выражениям и выдаёт результат:</p>\n  <ul>\n    <li>Синтаксис замены: <code>sed 's/старое/новое/' file.txt</code> (буква <code>s</code> означает <em>substitute</em> — заменить).</li>\n    <li><strong>Модификатор <code>g</code> (global):</strong> По умолчанию <code>sed</code> заменяет только <em>первое</em> вхождение в каждой строке. Буква <code>g</code> в конце выражения <code>'s/old/new/g'</code> заставляет заменить <strong>все вхождения без остатка</strong>!</li>\n    <li><strong>Редактирование на месте (флаг <code>-i</code>, in-place):</strong><br/>\n      Без флага <code>-i</code> утилита <code>sed</code> выводит результат в консоль, не меняя файл на диске. С ключом <code><strong>sed -i</strong></code> файл моментально перезаписывается с новыми значениями!\n    </li>\n  </ul>\n  <p><strong>Боевой пример смены порта SSH:</strong></p>\n  <pre><code>sed -i 's/Port 22/Port 2222/g' /etc/ssh/sshd_config</code></pre>\n  <p>Команда находит директиву <code>Port 22</code> и меняет её на <code>Port 2222</code> без открытия интерактивных редакторов.</p>\n</div>\n"
      },
      {
        "type": "cmd_anatomy",
        "cmd": "sed -i 's/Port 22/Port 2222/g' /etc/ssh/sshd_config",
        "desc": "Заменяет стандартный порт SSH 22 на 2222 непосредственно в конфигурационном файле /etc/ssh/sshd_config с помощью потокового редактора sed",
        "output": "[Файл /etc/ssh/sshd_config успешно обновлён на месте]",
        "notes": [
          "sed s/old/new/g выполняет глобальную замену текста",
          "Ключ -i (in-place) заставляет sed сохранить изменения прямо в исходном файле",
          "Незаменимо для скриптов автоматической настройки серверов и CI/CD"
        ]
      },
      {
        "type": "task_ref",
        "taskId": "t8n_4"
      },
      {
        "type": "step_head",
        "step": 4,
        "title": "Шаг 4. Конвейер Аналитики Логов [LPIC 103.2]: sort | uniq -c | sort -nr",
        "roadmap": "LPIC-1 Exam Prep [103.2]: Text Pipelines"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "На любом инциденте техдир спрашивает: «Кто нас ддосит? Дай мне топ IP-адресов по числу запросов!». Классический конвейер Unix из трёх команд выдаст ответ за секунду.<br/><br/>Связка <strong>sort | uniq -c | sort -nr</strong> — это вершина мастерства фильтрации текста в тестах LPIC-1!"
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Золотой конвейер частотного анализа Unix:</h4>\n  <pre><code>cat access.log | awk '{print $1}' | sort | uniq -c | sort -nr</code></pre>\n  <p>Разберём этот конвейер по шагам:</p>\n  <ol>\n    <li><code>awk '{print $1}'</code> — вырезает первое поле (IP-адрес клиента).</li>\n    <li><code>sort</code> — группирует одинаковые IP-адреса рядом друг с другом.</li>\n    <li><code>uniq -c</code> — считает повторы для каждой группы и добавляет число в начало строки (например, <code> 42 185.220.101.9</code>).</li>\n    <li><code><strong>sort -nr</strong></code> — финальная сортировка: ключ <code>-n</code> (по числам), ключ <code>-r</code> (реверс, от большего к меньшему). Самый частый IP-атакующий оказывается на первой строчке!</li>\n  </ol>\n</div>\n"
      },
      {
        "type": "diagram",
        "text": "\n  СВОДНАЯ МАТРИЦА ИНСТРУМЕНТОВ ОБРАБОТКИ ТЕКСТА:\n  =============================================================================\n  Инструмент │ Назначение                         │ Типичный пример\n  ───────────┼────────────────────────────────────┼────────────────────────────\n  cut        │ Вырезать столбцы по разделителю    │ cut -d: -f1 /etc/passwd\n  sort       │ Сортировка по алфавиту или числам  │ sort -n -r scores.txt\n  uniq -c    │ Подсчёт одинаковых соседних строк  │ sort log | uniq -c\n  tr         │ Посимвольная замена и удаление     │ tr 'a-z' 'A-Z'\n  awk        │ Продвинутая выборка колонок        │ awk -F: '{print $1, $3}'\n  sed -i     │ Автоматическая замена в файле      │ sed -i 's/foo/bar/g' conf\n  Конвейер   │ Топ-частых строк от макс к мин     │ sort | uniq -c | sort -nr\n  =============================================================================\n"
      },
      {
        "type": "task_ref",
        "taskId": "t8n_6"
      },
      {
        "type": "step_head",
        "step": 5,
        "title": "Шаг 5. Экзаменационный Тренажёр LPIC-1 [103.2] & Словарь Терминов",
        "roadmap": "LPIC-1 Exam Prep [103.2]"
      },
      {
        "type": "dialog",
        "char": "smith",
        "text": "Тема 103.2 экзамена LPIC-1 называется <em>«Process text streams using filters»</em>. Здесь проверяют понимание назначения утилит и синтаксиса конвейеров. Закрепляем термины!"
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Чек-лист правильных ответов экзамена LPIC-1 (Тема 103.2):</h4>\n  <ul>\n    <li><strong>Extract columns using a delimiter:</strong> <code>cut</code> (ключи <code>-d</code> delimiter и <code>-f</code> fields).</li>\n    <li><strong>Why sort is piped before uniq:</strong> <code>uniq</code> only detects adjacent (consecutive) duplicate lines.</li>\n    <li><strong>Translates or deletes characters from stdin:</strong> <code>tr</code>.</li>\n    <li><strong>Replace all occurrences of a pattern in a file:</strong> <code>sed -i 's/search/replace/g' file</code>.</li>\n    <li><strong>Rank items by frequency descending:</strong> <code>sort | uniq -c | sort -nr</code>.</li>\n  </ul>\n</div>\n"
      },
      {
        "type": "vocab"
      },
      {
        "type": "task_ref",
        "taskId": "t8n_2"
      },
      {
        "type": "task_ref",
        "taskId": "t8n_3"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "Держись крепче, боец! На наш веб-сервер обрушился шквал подозрительных POST-запросов. Включаем режим киберразведки 120%: выгрузи чистый список системных логинов командой <code>cut -d: -f1 /etc/passwd</code>, затем собери конвейер аналитики веб-лога <code>awk '{print $1}' /var/log/access.log | sort | uniq -c | sort -nr</code>, вычисли IP-адрес нападающего ботнета и введи его для блокировки фаерволом!"
      },
      {
        "type": "task_ref",
        "taskId": "t8_boss"
      }
    ],
    "vocab": [
      {
        "en": "delimiter",
        "pron": "[дили́митер]",
        "ru": "разделитель полей / символ разделения столбцов (ключ -d утилиты cut)",
        "assoc": "В /etc/passwd символом-разделителем (delimiter) является знак двоеточия"
      },
      {
        "en": "field",
        "pron": "[филд]",
        "ru": "поле / колонка / столбец в структурированном тексте (ключ -f)",
        "assoc": "Команда cut -f1 извлекает первое поле (field) каждой строки"
      },
      {
        "en": "adjacent",
        "pron": "[эдже́йсент]",
        "ru": "соседний / прилегающий / смежный",
        "assoc": "Утилита uniq сравнивает только соседние (adjacent) строки"
      },
      {
        "en": "consecutive",
        "pron": "[консе́кьютив]",
        "ru": "последовательный / идущий подряд",
        "assoc": "Consecutive duplicate lines — идущие подряд одинаковые строки в логе"
      },
      {
        "en": "stream editor",
        "pron": "[стрим э́дитор]",
        "ru": "потоковый текстовый редактор (утилита sed)",
        "assoc": "Sed обрабатывает поток байтов на лету без открытия интерактивного окна"
      },
      {
        "en": "numeric sort",
        "pron": "[ньюмэ́рик сорт]",
        "ru": "числовая сортировка (ключ -n команды sort)",
        "assoc": "Флаг -n гарантирует, что число 2 встанет раньше числа 10"
      }
    ],
    "tasks": [
      {
        "id": "t8_e0",
        "type": "builder",
        "title": "Экспресс-разминка: Разделители cut и ловушка uniq",
        "matter": 10,
        "difficulty": "easy",
        "char": "batya",
        "story": "Перед тем как парсить системные файлы и веб-логи, вспомни главные правила утилит cut и uniq!",
        "fields": [
          {
            "id": "cut_delim_flag",
            "label": "Ключ утилиты cut для задания разделителя полей (delimiter):",
            "options": [
              {
                "val": "d",
                "label": "-d (задать символ-разделитель)"
              },
              {
                "val": "f",
                "label": "-f (выбрать номера полей)"
              },
              {
                "val": "s",
                "label": "-s (пропускать строки без разделителя)"
              },
              {
                "val": "c",
                "label": "-c (вырезать по символам)"
              }
            ],
            "correct": "d"
          },
          {
            "id": "uniq_sort_prereq",
            "label": "Главное требование утилиты uniq для корректного подсчёта и удаления дубликатов:",
            "options": [
              {
                "val": "must_sort",
                "label": "Строки должны быть предварительно отсортированы (sort) подряд"
              },
              {
                "val": "no_sort",
                "label": "Сортировка не требуется, uniq ищет по всему файлу"
              },
              {
                "val": "root_only",
                "label": "Утилита запускается только от пользователя root"
              },
              {
                "val": "binary",
                "label": "Работает только с бинарными логами systemd"
              }
            ],
            "correct": "must_sort"
          }
        ],
        "requirements": [
          "Выбери ключ `cut` для указания разделителя колонок.",
          "Укажи обязательное условие работы утилиты `uniq`."
        ],
        "hint": "Разделитель задаётся ключом `-d`, а для работы `uniq` одинаковые строки обязательно должны идти подряд (нужен `sort`)!"
      },
      {
        "id": "t8n_1",
        "type": "terminal",
        "title": "Аналитика логов: вырежи логины через cut и найди топ IP в access.log",
        "matter": 30,
        "char": "diego",
        "story": "Почувствуй мощь конвейеров из `roadmap.sh/linux`! Сначала выведи чистый список имён пользователей из `/etc/passwd` командой `cut -d: -f1 /etc/passwd`, а затем проанализируй веб-лог `/var/log/access.log`: вытащи 1-ю колонку (IP-адреса) через `awk '{print $1}' /var/log/access.log | sort | uniq -c` и впиши подозрительный IP, который долбился 3 раза в `/login`!",
        "requirements": [
          "Вырежи 1-ю колонку из `/etc/passwd` командой `cut -d: -f1 /etc/passwd`.",
          "Посчитай частоту IP в логе конвейером `awk '{print $1}' /var/log/access.log | sort | uniq -c`.",
          "Впиши найденный IP атакующего (3 запроса) в поле ответа."
        ],
        "chips": [
          "cat /var/log/access.log",
          "cut -d: -f1 /etc/passwd",
          "awk '{print $1}' /var/log/access.log | sort | uniq -c"
        ],
        "expectedAnswer": "185.220.101.9",
        "answerLabel": "IP-адрес, встретившийся 3 раза:",
        "answerPlaceholder": "Например: 10.0.0.5",
        "checkRules": [
          "cmd:cut -d: -f1 /etc/passwd",
          "cmd:uniq",
          "ans:185.220.101.9"
        ],
        "hint": "Выполни в терминале обе команды — в выводе `uniq -c` увидишь строку `3 185.220.101.9`. Впиши `185.220.101.9` в поле ответа!",
        "difficulty": "medium"
      },
      {
        "id": "t8n_5",
        "type": "builder",
        "title": "Инженерный Пульт: Выбор Текстового Инструмента (cut, awk, uniq, tr)",
        "matter": 15,
        "char": "kira",
        "story": "Выбери правильный текстовый комбайн под конкретную задачу парсинга данных!",
        "requirements": [
          "Выбери инструмент для нарезки колонок по строгому одиночному символу (двоеточию).",
          "Определи команду для колонок с плавающим количеством пробелов в логах.",
          "Объясни, почему `uniq -c` не сработает корректно без предварительного `sort`.",
          "Укажи команду для перевода строчных букв в заглавные из потока stdin."
        ],
        "fields": [
          {
            "id": "tool_cut",
            "label": "1. Какой инструмент быстрее и проще всего использовать для извлечения 1-го поля из /etc/passwd по строгому разделителю-двоеточию?",
            "options": [
              {
                "val": "cut",
                "text": "cut -d: -f1 /etc/passwd"
              },
              {
                "val": "tr",
                "text": "tr -d: 1"
              },
              {
                "val": "sed",
                "text": "sed -i : 1"
              }
            ],
            "correct": "cut"
          },
          {
            "id": "tool_awk",
            "label": "2. Что выбрать для извлечения 1-й колонки из вывода ps aux или логов, где между столбцами плавает от 1 до 6 пробелов?",
            "options": [
              {
                "val": "awk",
                "text": "awk '{print $1}' (автоматически объединяет любые идущие подряд пробелы в один разделитель)"
              },
              {
                "val": "cut_space",
                "text": "cut -d' ' -f1 (он споткнётся о множественные пробелы и вернёт пустоту)"
              }
            ],
            "correct": "awk"
          },
          {
            "id": "uniq_rule",
            "label": "3. Почему конвейер `cat log | uniq -c` выдаст неверный подсчёт повторяющихся строк?",
            "options": [
              {
                "val": "adjacent",
                "text": "uniq сравнивает только соседние идущие подряд строки; одинаковые строки на разных позициях не объединятся"
              },
              {
                "val": "root_req",
                "text": "uniq требует прав суперпользователя root"
              }
            ],
            "correct": "adjacent"
          },
          {
            "id": "tr_case",
            "label": "4. Как преобразовать все строчные буквы входящего потока stdin в заглавные?",
            "options": [
              {
                "val": "tr_upper",
                "text": "tr 'a-z' 'A-Z'"
              },
              {
                "val": "sort_u",
                "text": "sort -u"
              },
              {
                "val": "cut_u",
                "text": "cut -U"
              }
            ],
            "correct": "tr_upper"
          }
        ],
        "hint": "Строгий разделитель — `cut`, плавающие пробелы — `awk`, `uniq` видит только соседние строки, а смена регистра — `tr 'a-z' 'A-Z'`!",
        "difficulty": "medium"
      },
      {
        "id": "t8n_4",
        "type": "terminal",
        "title": "Потоковый хирург: измени порт SSH на 2222 утилитой sed -i",
        "matter": 20,
        "char": "diego",
        "story": "Политика безопасности требует сменить стандартный порт SSH с `22` на `2222` в файле `/etc/ssh/sshd_config`. Сделай это потоковой утилитой `sed -i` на лету!",
        "requirements": [
          "Просмотри текущую конфигурацию SSH командой `cat /etc/ssh/sshd_config`.",
          "Замени строку `Port 22` на `Port 2222` на месте командой `sed -i 's/Port 22/Port 2222/g' /etc/ssh/sshd_config`.",
          "Убедись, что порт изменился, повторно открыв `/etc/ssh/sshd_config`."
        ],
        "chips": [
          "cat /etc/ssh/sshd_config",
          "sed -i 's/Port 22/Port 2222/g' /etc/ssh/sshd_config",
          "clear"
        ],
        "checkRules": [
          "cmd:sed -i",
          "file_has:/etc/ssh/sshd_config:Port 2222"
        ],
        "hint": "Выполни в терминале `cat /etc/ssh/sshd_config`, затем команду `sed -i 's/Port 22/Port 2222/g' /etc/ssh/sshd_config` и жми «✅ Проверка»!",
        "difficulty": "easy"
      },
      {
        "id": "t8n_6",
        "type": "lpic_en",
        "title": "Тренажёр LPIC-1 [103.2]: Конвейер подсчёта топ-частых строк",
        "matter": 15,
        "char": "smith",
        "story": "Классический конвейер анализа логов из официальной программы сертификации LPIC-1:",
        "enQuestion": "<w k='which'>Which</w> pipeline of <w k='commands'>commands</w> counts the frequency of each <w k='line'>line</w> in a <w k='file'>file</w> and <w k='prints'>prints</w> them sorted from the MOST frequent to the LEAST frequent?",
        "options": [
          {
            "val": "a",
            "text": "sort | uniq -c | sort -nr"
          },
          {
            "val": "b",
            "text": "uniq -c | sort | cut -f1"
          },
          {
            "val": "c",
            "text": "sort -r | uniq -d | tr 'a-z' 'A-Z'"
          },
          {
            "val": "d",
            "text": "grep -c | sort -n"
          }
        ],
        "correct": "a",
        "explainRu": "Идеально! Связка `sort | uniq -c | sort -nr` — золотой стандарт Linux: сначала сортируем для группировки дубликатов, затем `uniq -c` считает частоту, и финальный `sort -nr` сортирует по числу от большего к меньшему.",
        "requirements": [
          "Найди конвейер частотного анализа строк.",
          "Обрати внимание на числовую сортировку в обратном порядке (`sort -nr`)."
        ],
        "hint": "Группировка + подсчёт + обратная числовая сортировка -> `sort | uniq -c | sort -nr`!",
        "difficulty": "easy"
      },
      {
        "id": "t8n_2",
        "type": "lpic_fill",
        "title": "Ввод ответа LPIC-1 [103.2]: Вырезание столбцов из строк по разделителю",
        "matter": 25,
        "char": "smith",
        "story": "На реальном экзамене LPIC-1 тебя попросят вписать имя этой команды без подсказок и вариантов ответа!",
        "enQuestion": "<w k='which'>Which</w> <w k='command'>command</w> extracts specific columns or fields from each <w k='line'>line</w> of <w k='input'>input</w> using a delimiter (such as `-d: -f1`)? (<w k='specify'>Specify</w> <w k='only'>ONLY</w> the <w k='command'>command</w> name.)",
        "acceptedAnswers": [
          "cut"
        ],
        "placeholder": "Имя команды...",
        "explainRu": "Блестяще! Команда `cut` (от английского cut — резать) нарезает строки на поля по разделителю (`-d`) и выводит нужные столбцы (`-f`).",
        "requirements": [
          "Вспомни команду нарезки колонок по разделителю.",
          "Впиши только имя команды без флагов."
        ],
        "hint": "Три буквы: `cut`!",
        "difficulty": "easy"
      },
      {
        "id": "t8n_3",
        "type": "lpic_en",
        "title": "Тренажёр LPIC-1 [103.2]: Почему uniq требует предварительного sort?",
        "matter": 20,
        "char": "smith",
        "story": "Классическая ловушка собеседований и экзамена LPIC-1: почему голый `uniq file.txt` не удаляет все дубликаты?",
        "enQuestion": "Why is the `sort` <w k='command'>command</w> almost always piped before `uniq` (for example, `sort access.log | uniq -c`)?",
        "options": [
          {
            "val": "a",
            "text": "uniq only detects adjacent (consecutive) duplicate lines"
          },
          {
            "val": "b",
            "text": "uniq cannot read files larger than 1 MB without sort"
          },
          {
            "val": "c",
            "text": "sort converts binary logs into ASCII text for uniq"
          },
          {
            "val": "d",
            "text": "uniq requires root privileges unless input is sorted"
          }
        ],
        "correct": "a",
        "explainRu": "Точно в цель! `uniq` сравнивает ТОЛЬКО соседние идущие подряд строки. Если дубликаты разбросаны по файлу, `uniq` их пропустит. Поэтому сначала делаем `sort`, чтобы одинаковые строки встали рядом!",
        "requirements": [
          "Пойми механику работы утилиты `uniq`.",
          "Выбери причину, почему требуется предварительная сортировка."
        ],
        "hint": "uniq видит только идущие подряд дубли (adjacent lines) -> вариант A!",
        "difficulty": "easy"
      },
      {
        "id": "t8_boss",
        "type": "terminal",
        "title": "БОСС 120%: Киберразведка веб-сервера и частотный конвейер",
        "matter": 40,
        "difficulty": "hard",
        "char": "batya",
        "story": "Мониторинг безопасности зафиксировал попытку подбора паролей к административной панели. Тебе предстоит быстро выгрузить базу локальных пользователей и вскрыть источник распределённой атаки по журналу доступа.",
        "requirements": [
          "Выгрузи список учётных записей операционной системы, извлекая первую колонку пользователей из `/etc/passwd`.",
          "Запусти аналитический конвейер по веб-журналу `/var/log/access.log` с группировкой и числовой сортировкой частоты запросов от большего к меньшему.",
          "Определи IP-адрес злоумышленника, совершившего наибольшее число подозрительных обращений, и внеси его в поле ответа."
        ],
        "chips": [
          "cut -d: -f1 /etc/passwd",
          "awk '{print $1}' /var/log/access.log | sort | uniq -c | sort -nr"
        ],
        "expectedAnswer": "185.220.101.9",
        "answerLabel": "IP-адрес атакующего хоста (топ по частоте):",
        "answerPlaceholder": "Например: 10.0.0.5",
        "checkRules": [
          "cmd:cut -d: -f1 /etc/passwd",
          "cmd:sort",
          "cmd:uniq",
          "ans:185.220.101.9"
        ],
        "hint": "Выполни в терминале: `cut -d: -f1 /etc/passwd`, затем `awk '{print $1}' /var/log/access.log | sort | uniq -c | sort -nr` — верхняя строка покажет `3 185.220.101.9`. Впиши `185.220.101.9` в поле ответа и жми «✅ Проверка»!"
      }
    ]
  },
  {
    "level": 9,
    "questId": "q_linux",
    "cost": 50,
    "title": "Пакетные Менеджеры: Империя Debian (apt/dpkg) против Империи RHEL (dnf/rpm)",
    "shortDesc": "Два великих мира Linux: экосистема Debian/Ubuntu (apt, dpkg) против мира Red Hat/Fedora (dnf, rpm), репозитории и расследование принадлежности файлов.",
    "blocks": [
      {
        "type": "step_head",
        "step": 1,
        "title": "Шаг 1. Архитектура Репозиториев и Священная Троица apt (update, upgrade, install, purge)",
        "roadmap": "roadmap.sh: Package Management Concepts"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "Пользователи, пришедшие из мира Windows, по старой привычке лезут в браузер, чтобы скачать какой-нибудь <code>setup.exe</code> с сомнительного сайта. В мире серверов Linux за такое сразу бьют по рукам!<br/><br/>В Linux уже 30 лет действует безопасная архитектура <strong>Репозиториев</strong> — централизованных доверенных каталогов ПО, где каждый пакет проверен и подписан цифровой криптографической подписью разработчиков.<br/><br/>Давай разберёмся, как устроена экосистема Debian/Ubuntu и почему команды <code>apt update</code>, <code>apt upgrade</code>, <code>apt remove</code> и <code>apt purge</code> делают совершенно разные вещи!"
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Почему в серверах Linux не скачивают файлы вручную</h4>\n  <p>В Linux программы распространяются в виде <strong>пакетов</strong>. Пакет — это сжатый архив, содержащий бинарные файлы программы, документацию, файлы конфигурации по умолчанию и сценарии автоматической установки, а главное — <em>манифест зависимостей (dependencies)</em>.</p>\n  <p>Адреса официальных репозиториев хранятся в файле <code>/etc/apt/sources.list</code> и каталоге <code>/etc/apt/sources.list.d/*.list</code>.</p>\n</div>\n\n<div class=\"theory-section\">\n  <h4>2. Священные команды управления: <code>update</code>, <code>upgrade</code>, <code>remove</code> и <code>purge</code></h4>\n  <ul>\n    <li><code><strong>apt update</strong></code>: <strong>НЕ обновляет программы на диске!</strong><br/>\n      Она обращается по сети к репозиториям и скачивает локально в кэш <em>«прайс-лист» (индекс пакетов)</em>: список того, какие версии программ сейчас доступны.\n    </li>\n    <li><code><strong>apt upgrade</strong></code>: <strong>Фактическое обновление установленных программ!</strong><br/>\n      Сравнивает версии пакетов на диске со свежим «прайс-листом», скачивает и обновляет бинарные файлы.\n    </li>\n    <li><code><strong>apt install -y &lt;пакет&gt;</strong></code>: Скачивает и устанавливает программу и все её зависимости.</li>\n    <li><code><strong>apt remove &lt;пакет&gt;</strong></code>: Удаляет исполняемые бинарники, но <strong>оставляет нетронутыми файлы её настроек в каталоге <code>/etc</code></strong>!</li>\n    <li><code><strong>apt purge &lt;пакет&gt;</strong></code> (или <code>apt-get purge</code>): <strong>Тотальная зачистка!</strong> Удаляет программу подчистую <strong>вместе со всеми конфигурационными файлами в <code>/etc</code></strong>.</li>\n  </ul>\n</div>\n\n<div class=\"theory-section\">\n  <h4>3. Охота на вредоносные процессы: <code>ps aux</code> и <code>kill -9</code></h4>\n  <p>Если после установки пакета или взлома сервер гудит кулерами, снимаем слепок работающих программ командой <code>ps aux</code>, находим PID виновника и принудительно убиваем: <code>kill -9 &lt;PID&gt;</code>.</p>\n</div>\n"
      },
      {
        "type": "cmd_anatomy",
        "cmd": "apt update && apt install -y nginx curl htop",
        "desc": "Обновляет кэш доступных версий ПО из сетевых репозиториев и устанавливает веб-сервер, инструмент сетевых запросов и интерактивный монитор процессов",
        "output": "Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease\nReading package lists... Done\nSetting up nginx (1.18.0-6ubuntu14)... done.",
        "notes": [
          "apt update обновляет только локальный индекс версий (кэш), не меняя файлы на диске",
          "apt upgrade устанавливает свежие версии уже имеющихся пакетов",
          "apt purge в отличие от apt remove полностью вычищает конфигурационные файлы из /etc",
          "Адреса сетевых репозиториев хранятся в /etc/apt/sources.list и /etc/apt/sources.list.d/"
        ]
      },
      {
        "type": "task_ref",
        "taskId": "t9n_4"
      },
      {
        "type": "task_ref",
        "taskId": "t5_1"
      },
      {
        "type": "step_head",
        "step": 2,
        "title": "Шаг 2. Низкоуровневый Хирург Debian: Утилита dpkg (-i, -l, -L, -S)",
        "roadmap": "roadmap.sh: Low-Level Debian Tools (dpkg)"
      },
      {
        "type": "dialog",
        "char": "diego",
        "text": "Утилита <code>apt</code> — это высокоуровневый менеджер: она сама ходит в сеть. Но прямо под её капотом работает рабочая лошадка — <strong>dpkg</strong>!<br/><br/>Она управляет локальными файлами <code>.deb</code> и системной базой <code>/var/lib/dpkg/</code>. Когда безопасники спрашивают: <em>«Какому пакету принадлежит файл /usr/sbin/sshd?»</em> — мы достаём флаги <code>dpkg -S</code> и <code>dpkg -L</code>!"
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Ключевые флаги утилиты <code>dpkg</code>:</h4>\n  <ul>\n    <li><code><strong>dpkg -i file.deb</strong></code>: Установить локальный deb-пакет с диска.</li>\n    <li><code><strong>dpkg -l</strong></code> (строчная L): Показать список всех установленных пакетов в системе.</li>\n    <li><code><strong>dpkg -L &lt;package&gt;</strong></code> (ЗАГЛАВНАЯ буква L!):<br/>\n      <strong>Показать список всех файлов, которые данный пакет установил в систему!</strong> Позволяет мгновенно узнать расположение файлов: <code>dpkg -L nginx</code>.\n    </li>\n    <li><code><strong>dpkg -S &lt;/путь/к/файлу&gt;</strong></code> (ЗАГЛАВНАЯ буква S!):<br/>\n      <strong>Пакетный детектив (Search):</strong> Находит, какому именно пакету принадлежит файл на диске!<br/>\n      Команда <code>dpkg -S /usr/sbin/sshd</code> выдаст: <code>openssh-server: /usr/sbin/sshd</code>.\n    </li>\n  </ul>\n</div>\n"
      },
      {
        "type": "cmd_anatomy",
        "cmd": "dpkg -S /usr/sbin/sshd && dpkg -L nginx",
        "desc": "Определяет пакет-владелец бинарного файла sshd и выводит полный список файлов, развернутых веб-сервером nginx",
        "output": "openssh-server: /usr/sbin/sshd\n/etc/nginx\n/etc/nginx/nginx.conf\n/usr/sbin/nginx",
        "notes": [
          "dpkg -S (Search) находит пакет-владелец указанного файла в системе",
          "dpkg -L (List) отображает все файлы и папки, принадлежащие пакету",
          "dpkg работает строго локально с базой данных /var/lib/dpkg/"
        ]
      },
      {
        "type": "task_ref",
        "taskId": "t9n_1"
      },
      {
        "type": "step_head",
        "step": 3,
        "title": "Шаг 3. Режим Red Hat и Rocky Linux: Низкоуровневый Менеджер rpm (-qa, -ql, -qf)",
        "roadmap": "roadmap.sh: Red Hat / RPM Package Management"
      },
      {
        "type": "dialog",
        "char": "diego",
        "text": "Пересаживаемся на сервер Red Hat Enterprise Linux / Rocky Linux / AlmaLinux! Здесь вместо <code>.deb</code> правят бал пакеты <strong>.rpm</strong>, а сетевой менеджер зовётся <code>dnf</code>.<br/><br/>Низкоуровневой утилитой для аудита файлов здесь выступает <strong>rpm</strong>. Все её команды строятся вокруг ключа запроса <code><strong>-q</strong></code> (query). Давай освоим тройку главных флагов: <strong>-qa, -ql, -qf</strong>!"
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Архитектура RPM в экосистеме Red Hat / Rocky Linux</h4>\n  <p>Команда <code>rpm</code> (RPM Package Manager) работает с локальной базой данных RPM. Её базовый режим — опрос (query) через ключ <code><strong>-q</strong></code>:</p>\n  <ul>\n    <li><code><strong>rpm -qa</strong></code> (Query All):<br/>\n      <strong>Вывести список ВСЕХ установленных пакетов в системе.</strong> Это прямой аналог <code>dpkg -l</code> из мира Debian. Команда <code>rpm -qa | grep nginx</code> покажет точную версию установленного веб-сервера.\n    </li>\n    <li><code><strong>rpm -ql &lt;package&gt;</strong></code> (Query List):<br/>\n      <strong>Показать список всех файлов, установленных данным пакетом.</strong> Это прямой аналог <code>dpkg -L</code>. Команда <code>rpm -ql nginx</code> выведет пути к конфигам и бинарникам.\n    </li>\n    <li><code><strong>rpm -qf &lt;/путь/к/файлу&gt;</strong></code> (Query File):<br/>\n      <strong>Пакетный детектив Red Hat!</strong> Находит, какому именно пакету принадлежит указанный файл на диске. Это прямой аналог <code>dpkg -S</code>!<br/>\n      Команда <code>rpm -qf /usr/sbin/nginx</code> моментально ответит: <code>nginx: /usr/sbin/nginx</code>.\n    </li>\n    <li><code><strong>rpm -qi &lt;package&gt;</strong></code> (Query Info):<br/>\n      Вывести детальную информацию о пакете: версию, релиз, размер, цифровую подпись и краткое описание.\n    </li>\n  </ul>\n</div>\n"
      },
      {
        "type": "cmd_anatomy",
        "cmd": "rpm -qa && rpm -qf /usr/sbin/nginx",
        "desc": "Выводит список всех установленных RPM-пакетов и находит, какой именно пакет установил файл /usr/sbin/nginx",
        "output": "ii  bash            5.2.21-2   amd64\nii  nginx           1.24.0-2   amd64\nnginx: /usr/sbin/nginx",
        "notes": [
          "rpm -qa (query all) выводит все установленные RPM-пакеты системы",
          "rpm -qf (query file) находит пакет-владелец указанного файла",
          "rpm -ql (query list) отображает все файлы, распакованные пакетом"
        ]
      },
      {
        "type": "task_ref",
        "taskId": "t9n_3"
      },
      {
        "type": "step_head",
        "step": 4,
        "title": "Шаг 4. Зеркальная Дуэль Двух Империй: Debian против Red Hat",
        "roadmap": "roadmap.sh: Debian vs Red Hat Rosetta Stone"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "Две половины серверного мира Linux смотрят друг на друга как в зеркало. Опытный сисадмин свободно переключается между Debian и RHEL на лету, не заглядывая в шпаргалки!<br/><br/>Давай сведем все команды в единую кристальную матрицу соответствия."
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Зеркальная матрица операций управления пакетами:</h4>\n  <p>Каждой команде из мира Debian строго соответствует команда-двойник в мире Red Hat:</p>\n  <ul>\n    <li>Обновление кэша репозиториев: <code>apt update</code> ↔ <code>dnf check-update</code></li>\n    <li>Установка программ: <code>apt install</code> ↔ <code>dnf install</code></li>\n    <li>Удаление с сохранением конфигов: <code>apt remove</code> ↔ <code>dnf remove</code></li>\n    <li>Удаление вместе с конфигами в /etc: <code>apt purge</code></li>\n    <li>Список всех пакетов в ОС: <code>dpkg -l</code> ↔ <code>rpm -qa</code></li>\n    <li>Список файлов пакета: <code>dpkg -L &lt;пакет&gt;</code> ↔ <code>rpm -ql &lt;пакет&gt;</code></li>\n    <li>Поиск пакета-владельца файла: <code>dpkg -S &lt;/путь&gt;</code> ↔ <code>rpm -qf &lt;/путь&gt;</code></li>\n  </ul>\n</div>\n"
      },
      {
        "type": "diagram",
        "text": "\n  ЗЕРКАЛЬНАЯ ТАБЛИЦА ПАКЕТНЫХ МЕНЕДЖЕРОВ (LPIC-1 102.4 & 102.5):\n  =============================================================================\n  Операция                      │ Мир Debian / Ubuntu      │ Мир Red Hat / RHEL / Rocky\n  ──────────────────────────────┼──────────────────────────┼───────────────────────────\n  Формат пакета                 │ .deb                     │ .rpm\n  Сетевой менеджер (репозитории)│ apt update / install     │ dnf update / install\n  Локальная установка файла     │ dpkg -i app.deb          │ rpm -ivh app.rpm\n  Список всех пакетов в ОС      │ dpkg -l                  │ rpm -qa\n  Список файлов пакета          │ dpkg -L nginx            │ rpm -ql nginx\n  Поиск пакета-владельца файла  │ dpkg -S /usr/sbin/sshd   │ rpm -qf /usr/sbin/sshd\n  Информация о пакете           │ dpkg -s nginx            │ rpm -qi nginx\n  =============================================================================\n"
      },
      {
        "type": "task_ref",
        "taskId": "t9n_2"
      },
      {
        "type": "step_head",
        "step": 5,
        "title": "Шаг 5. Экзаменационные Ловушки dpkg vs rpm на LPIC-1 [102.4, 102.5]",
        "roadmap": "LPIC-1 Exam Prep [102.4 & 102.5]"
      },
      {
        "type": "dialog",
        "char": "smith",
        "text": "Экзамен LPIC-1 беспристрастен: программа строго делится 50/50 между Debian и Red Hat. Излюбленная подлянка авторов тестов — подсунуть в вопрос по системе Debian правильный ключ от Red Hat (например, <code>rpm -qf</code> вместо <code>dpkg -S</code>). Не заметил дистрибутив в вопросе — и ответ не засчитан!<br/><br/>Давай закрепим экзаменационные формулировки!"
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Чек-лист экзаменационных ответов LPIC-1 (Темы 102.4 и 102.5):</h4>\n  <ul>\n    <li><strong>On a Debian-based system, find package owning a file:</strong> <code>dpkg -S /path/to/file</code>.</li>\n    <li><strong>On a Red Hat system, find package owning a file:</strong> <code>rpm -qf /path/to/file</code>.</li>\n    <li><strong>Completely purge package and configs in Debian:</strong> <code>apt purge</code>.</li>\n    <li><strong>List all installed packages on RPM system:</strong> <code>rpm -qa</code>.</li>\n    <li><strong>List all files installed by RPM package:</strong> <code>rpm -ql package</code>.</li>\n  </ul>\n</div>\n"
      },
      {
        "type": "vocab"
      },
      {
        "type": "task_ref",
        "taskId": "t5_3"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "Отличная работа с репозиториями, боец! Но в энтерпрайзе тебе придётся админить гетерогенный парк: утренний инцидент на Ubuntu с <code>dpkg</code> и <code>apt</code>, а вечерний — на RHEL и Rocky Linux с <code>rpm</code> и <code>dnf</code>. Соберись на Босс-Стенд 120%: покажи безупречное знание кросс-платформенных команд управления пакетами и их ключей для обеих систем!"
      },
      {
        "type": "task_ref",
        "taskId": "t9_boss"
      }
    ],
    "vocab": [
      {
        "en": "package",
        "pron": "[пэ́кидж]",
        "ru": "пакет программного обеспечения (.deb в Debian, .rpm в Red Hat)",
        "assoc": "Пакет содержит скомпилированные программы и скрипты автоматической установки"
      },
      {
        "en": "repository",
        "pron": "[рипо́зитори]",
        "ru": "репозиторий / сетевое хранилище проверенного софта",
        "assoc": "В Linux программы скачиваются из официальных доверенных репозиториев"
      },
      {
        "en": "dependencies",
        "pron": "[дипе́нденсиз]",
        "ru": "зависимости программы (библиотеки, требуемые для её работы)",
        "assoc": "Менеджеры apt и dnf автоматически разрешают и устанавливают все dependencies"
      },
      {
        "en": "purge",
        "pron": "[пёрдж]",
        "ru": "полная зачистка пакета вместе с конфигурационными файлами в /etc",
        "assoc": "Команда apt purge полностью вычищает настройки утилиты, не оставляя следов"
      },
      {
        "en": "query",
        "pron": "[куэ́ри]",
        "ru": "запрос / опрос локальной базы пакетов (ключ -q в утилите rpm)",
        "assoc": "Команда rpm -qf выполняет query (запрос) по имени файла"
      },
      {
        "en": "low-level installer (dpkg / rpm)",
        "pron": "[ди-пи-кэй-джи́ / ар-пи-э́м]",
        "ru": "низкоуровневый установщик локальных пакетов без скачивания из сети",
        "assoc": "dpkg -l и rpm -qa опрашивают базу установленных пакетов напрямую"
      }
    ],
    "tasks": [
      {
        "id": "t9n_4",
        "type": "lpic_fill",
        "title": "Ввод ответа LPIC-1 [102.4]: Полное удаление пакета вместе с конфигами",
        "matter": 15,
        "char": "smith",
        "story": "Экзаменационный вопрос LPIC-1: какая команда полностью вычищает пакет и все его файлы настроек из /etc?",
        "enQuestion": "<w k='which'>Which</w> `apt` sub-<w k='command'>command</w> completely removes a <w k='package'>package</w> along with all of its <w k='configuration'>configuration</w> <w k='files'>files</w> in `/etc`? (<w k='specify'>Specify</w> the subcommand or full <w k='command'>command</w>.)",
        "acceptedAnswers": [
          "apt purge",
          "apt-get purge",
          "purge"
        ],
        "placeholder": "Например: purge",
        "explainRu": "Великолепно! Команда `apt purge` (или `apt-get purge`) удаляет пакет целиком, включая все конфигурационные файлы в каталоге `/etc` (в отличие от `apt remove`, который сохраняет конфиги).",
        "requirements": [
          "Вспомни подкоманду `apt` для полного удаления с конфигами.",
          "Введи `purge` или `apt purge`."
        ],
        "hint": "Шесть букв: `purge` (или `apt purge`)!",
        "difficulty": "easy"
      },
      {
        "id": "t5_1",
        "type": "terminal",
        "title": "Охота на майнера: обнови apt, найди пожирателя CPU и прибей его!",
        "matter": 30,
        "char": "diego",
        "story": "Кулеры на сервере ревут на взлёт — кто-то жрёт 99% CPU! Обнови индекс пакетов `apt`, просканируй процессы `ps aux` и жёстко пристрели зависший подозрительный процесс сигналом `-9`!",
        "requirements": [
          "Обнови список пакетов из репозиториев командой `apt update`.",
          "Выведи список всех запущенных процессов в системе (`ps aux`).",
          "Принудительно убей процесс `cryptominer`, который грузит 99.2% CPU, командой `kill -9 <его_PID>`."
        ],
        "chips": [
          "apt update",
          "ps aux",
          "kill -9 6660"
        ],
        "hint": "Выполни в терминале `apt update`, затем `ps aux`. В таблице увидишь `root 6660 99.2 ... /tmp/cryptominer` (PID = `6660`). Выполни `kill -9 6660`!",
        "checkRules": [
          "cmd:apt update",
          "cmd:ps aux",
          "proc_killed:6660"
        ],
        "difficulty": "medium"
      },
      {
        "id": "t9n_1",
        "type": "terminal",
        "title": "Пакетный криминалист: выясни владельца бинарника sshd и состав пакета nginx",
        "matter": 25,
        "char": "diego",
        "story": "Аудитор безопасности спрашивает: из какого именно `.deb`-пакета взялся файл `/usr/sbin/sshd` и какие конфиги установил пакет `nginx`? Проверь это низкоуровневыми флагами `dpkg -S` и `dpkg -L`!",
        "requirements": [
          "Узнай пакет-владелец файла командой `dpkg -S /usr/sbin/sshd`.",
          "Выведи список файлов пакета командой `dpkg -L nginx`.",
          "Впиши имя пакета, которому принадлежит `/usr/sbin/sshd`."
        ],
        "chips": [
          "dpkg -l",
          "dpkg -S /usr/sbin/sshd",
          "dpkg -L nginx"
        ],
        "expectedAnswer": "openssh-server",
        "answerLabel": "Имя пакета-владельца /usr/sbin/sshd:",
        "answerPlaceholder": "Например: openssh-client",
        "checkRules": [
          "cmd:dpkg -S /usr/sbin/sshd",
          "cmd:dpkg -L nginx",
          "ans:openssh-server"
        ],
        "hint": "Запусти `dpkg -S /usr/sbin/sshd` (увидишь `openssh-server: /usr/sbin/sshd`) и `dpkg -L nginx`!",
        "difficulty": "medium"
      },
      {
        "id": "t9n_3",
        "type": "terminal",
        "title": "Аудит Red Hat: узнай пакет-владелец веб-сервера через rpm -qf",
        "matter": 15,
        "char": "diego",
        "story": "Ты подключился к серверу на базе Rocky Linux / RHEL. Проверь установленные RPM-пакеты командой `rpm -qa`, найди пакет-владелец бинарника `/usr/sbin/nginx` через `rpm -qf /usr/sbin/nginx` и впиши его имя!",
        "requirements": [
          "Выведи список установленных пакетов командой `rpm -qa`.",
          "Определи, какому пакету принадлежит файл `/usr/sbin/nginx`, командой `rpm -qf /usr/sbin/nginx`.",
          "Впиши имя найденного пакета в поле ответа."
        ],
        "chips": [
          "rpm -qa",
          "rpm -qf /usr/sbin/nginx",
          "rpm -ql nginx",
          "clear"
        ],
        "expectedAnswer": "nginx",
        "answerLabel": "Имя RPM-пакета, владеющего /usr/sbin/nginx:",
        "answerPlaceholder": "Например: nginx-core",
        "checkRules": [
          "cmd:rpm -qa",
          "cmd:rpm -qf",
          "ans:nginx"
        ],
        "hint": "Запусти `rpm -qa`, затем `rpm -qf /usr/sbin/nginx` — в выводе увидишь `nginx: /usr/sbin/nginx`. Впиши `nginx` в поле ответа!",
        "difficulty": "medium"
      },
      {
        "id": "t9n_2",
        "type": "builder",
        "title": "Инженерный Пульт: Зеркало Двух Империй (Debian vs Red Hat)",
        "matter": 20,
        "char": "batya",
        "story": "Сопоставь операции управления пакетами между экосистемами Debian/Ubuntu и Red Hat/Rocky Linux!",
        "requirements": [
          "Различи роли команд apt update и apt upgrade.",
          "Выбери разницу между apt remove и apt purge.",
          "Сопоставь команду вывода файлов пакета (dpkg -L) с её близнецом в RPM.",
          "Найди эквивалент поиска владельца файла (dpkg -S) в мире Red Hat."
        ],
        "fields": [
          {
            "id": "apt_upd_vs_upg",
            "label": "1. Чем отличается команда `apt update` от `apt upgrade`?",
            "options": [
              {
                "val": "upd_cache",
                "text": "apt update только скачивает свежий список доступных версий (кэш), а apt upgrade фактически обновляет программы на диске"
              },
              {
                "val": "upd_files",
                "text": "apt update обновляет программы, а apt upgrade удаляет старые версии"
              }
            ],
            "correct": "upd_cache"
          },
          {
            "id": "apt_rem_vs_purge",
            "label": "2. В чём принципиальная разница между `apt remove` и `apt purge`?",
            "options": [
              {
                "val": "purge_etc",
                "text": "apt remove оставляет конфигурационные файлы в /etc, а apt purge полностью стирает софт вместе со всеми конфигами"
              },
              {
                "val": "remove_faster",
                "text": "apt remove удаляет быстрее, а purge делает паузу"
              }
            ],
            "correct": "purge_etc"
          },
          {
            "id": "list_files_mirror",
            "label": "3. Какой команде в Red Hat/Rocky (RPM) строго соответствует команда `dpkg -L <пакет>` из Debian?",
            "options": [
              {
                "val": "rpm_ql",
                "text": "rpm -ql <пакет> (query list — список всех файлов пакета)"
              },
              {
                "val": "rpm_qa",
                "text": "rpm -qa (query all — список всех пакетов системы)"
              },
              {
                "val": "rpm_qi",
                "text": "rpm -qi (query info — описание пакета)"
              }
            ],
            "correct": "rpm_ql"
          },
          {
            "id": "search_file_mirror",
            "label": "4. Какой команде в Red Hat/Rocky (RPM) строго соответствует детектив владельца файла `dpkg -S </путь>` из Debian?",
            "options": [
              {
                "val": "rpm_qf",
                "text": "rpm -qf </путь> (query file — поиск пакета-владельца)"
              },
              {
                "val": "rpm_qc",
                "text": "rpm -qc (query config)"
              },
              {
                "val": "rpm_qd",
                "text": "rpm -qd (query doc)"
              }
            ],
            "correct": "rpm_qf"
          }
        ],
        "hint": "Update — это кэш, purge — удаление конфигов в /etc, dpkg -L = rpm -ql, а dpkg -S = rpm -qf!",
        "difficulty": "medium"
      },
      {
        "id": "t5_3",
        "type": "lpic_en",
        "title": "Тренажёр LPIC-1 [102.4]: Какому .deb пакету принадлежит файл?",
        "matter": 20,
        "char": "smith",
        "story": "На сервере Ubuntu лежит файл `/bin/ls`, и надо узнать, какой пакет его туда поставил.",
        "enQuestion": "On a Debian-based <w k='system'>system</w>, <w k='which'>which</w> <w k='command'>command</w> searches for the <w k='installed'>installed</w> <w k='package'>package</w> that owns a specific <w k='file'>file</w> <w k='path'>path</w>?",
        "options": [
          {
            "val": "a",
            "text": "dpkg -S"
          },
          {
            "val": "b",
            "text": "apt install"
          },
          {
            "val": "c",
            "text": "rpm -qf"
          },
          {
            "val": "d",
            "text": "lsmod"
          }
        ],
        "correct": "a",
        "explainRu": "Чётко! В мире Debian за поиск владельца файла отвечает `dpkg -S /путь` (`-S` = Search). А `rpm -qf` — это её близнец из мира Red Hat!",
        "requirements": [
          "Обрати внимание, что система — `Debian-based` (значит `dpkg` или `apt`, а не `rpm`).",
          "Выбери ключ поиска пакета-владельца файла."
        ],
        "hint": "Debian + Search = `dpkg -S`!",
        "difficulty": "easy"
      },
      {
        "id": "t9_boss",
        "type": "builder",
        "title": "БОСС 120%: Матрица кросс-платформенного аудита пакетов (Debian vs RedHat)",
        "matter": 40,
        "difficulty": "hard",
        "char": "batya",
        "story": "Ты ведущий системный архитектор. Тебе необходимо утвердить единый регламент обслуживания смешанного серверного парка серверов Debian/Ubuntu и RedHat/AlmaLinux.",
        "fields": [
          {
            "id": "boss_pkg_search_file",
            "label": "Поиск установленного пакета, которому принадлежит файл /usr/sbin/sshd (Debian vs RedHat):",
            "options": [
              {
                "val": "dpkg_S_rpm_qf",
                "label": "dpkg -S /usr/sbin/sshd  |  rpm -qf /usr/sbin/sshd"
              },
              {
                "val": "dpkg_L_rpm_ql",
                "label": "dpkg -L /usr/sbin/sshd  |  rpm -ql /usr/sbin/sshd"
              },
              {
                "val": "apt_find_rpm_find",
                "label": "apt find /usr/sbin/sshd  |  rpm --find /usr/sbin/sshd"
              },
              {
                "val": "dpkg_p_rpm_qa",
                "label": "dpkg -p /usr/sbin/sshd  |  rpm -qa /usr/sbin/sshd"
              }
            ],
            "correct": "dpkg_S_rpm_qf"
          },
          {
            "id": "boss_pkg_list_contents",
            "label": "Вывод полного списка файлов, установленных пакетом nginx в систему:",
            "options": [
              {
                "val": "dpkg_L_rpm_ql",
                "label": "dpkg -L nginx  |  rpm -ql nginx"
              },
              {
                "val": "dpkg_s_rpm_qi",
                "label": "dpkg -s nginx  |  rpm -qi nginx"
              },
              {
                "val": "apt_list_rpm_list",
                "label": "apt list nginx  |  rpm -l nginx"
              },
              {
                "val": "dpkg_c_rpm_q",
                "label": "dpkg -c nginx  |  rpm -q nginx"
              }
            ],
            "correct": "dpkg_L_rpm_ql"
          },
          {
            "id": "boss_pkg_purge_configs",
            "label": "Полное удаление пакета вместе со всеми конфигурационными файлами в /etc в Debian/Ubuntu:",
            "options": [
              {
                "val": "apt_purge",
                "label": "apt purge <пакет> (или apt-get --purge remove)"
              },
              {
                "val": "apt_remove",
                "label": "apt remove <пакет> (удаляет бинарники, оставляя конфиги)"
              },
              {
                "val": "dpkg_r",
                "label": "dpkg -r <пакет> (оставляет конфигурацию)"
              },
              {
                "val": "apt_clean",
                "label": "apt clean (очищает кэш .deb в /var/cache/apt/archives)"
              }
            ],
            "correct": "apt_purge"
          },
          {
            "id": "boss_pkg_offline_rpm_inspect",
            "label": "Просмотр информации и зависимостей в ещё НЕ установленном файле пакета package.rpm:",
            "options": [
              {
                "val": "rpm_qip",
                "label": "rpm -qip package.rpm (флаг -p для файла на диске)"
              },
              {
                "val": "rpm_qi",
                "label": "rpm -qi package.rpm (ищет только в базе установленных)"
              },
              {
                "val": "rpm_qa",
                "label": "rpm -qa package.rpm (список всех пакетов в системе)"
              },
              {
                "val": "rpm_Vp",
                "label": "rpm -Vp package.rpm (проверка целостности)"
              }
            ],
            "correct": "rpm_qip"
          },
          {
            "id": "boss_pkg_cache_sync",
            "label": "Синхронизация локальных списков пакетов с удалёнными репозиториями:",
            "options": [
              {
                "val": "apt_update_dnf_makecache",
                "label": "apt update  |  dnf makecache"
              },
              {
                "val": "apt_upgrade_dnf_upgrade",
                "label": "apt upgrade  |  dnf upgrade"
              },
              {
                "val": "dpkg_update_rpm_update",
                "label": "dpkg --update  |  rpm -U"
              },
              {
                "val": "apt_install_dnf_install",
                "label": "apt install  |  dnf install"
              }
            ],
            "correct": "apt_update_dnf_makecache"
          }
        ],
        "requirements": [
          "Сопоставь команды поиска владельца файла для систем Debian и RedHat.",
          "Выбери пару команд для инспекции списка файлов установленного пакета.",
          "Определи операцию полного удаления программы с очисткой конфигов в `/etc`.",
          "Укажи команду инспекции ещё не установленного локального RPM-файла с ключом `-p`.",
          "Выбери связку команд обновления локального кэша репозиториев для обеих ОС."
        ],
        "hint": "Поиск владельца — `dpkg -S / rpm -qf`, список файлов — `dpkg -L / rpm -ql`, снос конфигов — `purge`, локальный файл RPM — ключ `-p` (`rpm -qip`), а обновление кэша — `apt update` и `dnf makecache`!"
      }
    ]
  },
  {
    "level": 10,
    "questId": "q_linux",
    "cost": 50,
    "title": "Анатомия Процессов: Load Average, Сигналы kill (15 vs 9), nice и Фоновый Режим (&, jobs, nohup)",
    "shortDesc": "Расшифровка трех чисел Load Average в uptime, сигналы SIGHUP/SIGTERM/SIGKILL, шкала приоритетов nice (-20..+19), фоновые задачи & и неубиваемый nohup.",
    "blocks": [
      {
        "type": "step_head",
        "step": 1,
        "title": "Шаг 1. Тайна трёх чисел Load Average, Приоритеты nice/renice и Фоновый Режим (&, jobs, nohup)",
        "roadmap": "roadmap.sh: Process Lifecycle & Scheduling"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "Когда ты вводишь команду <code>uptime</code>, сервер выдаёт строчку вроде: <code>load average: 0.15, 0.85, 2.40</code>. Что значат эти загадочные три числа? Почему при значении 4.0 на двухъядерном сервере всё висит колом, а на 16-ядерном монстре система даже не заметила нагрузки?<br/><br/>И что делать, если тебе нужно запустить тяжёлый ночной бэкап на 4 часа, не боясь, что разрыв соединения по Wi-Fi или закрытие ноутбука убьёт процесс посреди ночи? Сейчас разложим всё по полочкам!"
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Расшифровка трёх чисел Load Average</h4>\n  <p><strong>Load Average</strong> — метрика, показывающая среднее количество процессов, которые выполняются на CPU, ждут очереди к CPU или заблокированы дисковым вводом-выводом (D-state).</p>\n  <p>Три числа отражают среднюю нагрузку за <strong>1 минуту</strong>, <strong>5 минут</strong> и <strong>15 минут</strong>.</p>\n  <p><strong>Как понять, задыхается ли сервер? Сравниваем числа с количеством ядер CPU (<code>nproc</code>):</strong></p>\n  <ul>\n    <li>Представь <strong>4-ядерный процессор</strong>:\n      <ul>\n        <li><code>Load Average = 2.00</code> — сервер загружен на 50% (два ядра свободны).</li>\n        <li><code>Load Average = 4.00</code> — нагрузка ровно 100% (все ядра заняты, очередей нет).</li>\n        <li><code>Load Average = 8.00</code> — <strong>сервер перегружен ровно в 2 раза!</strong> 4 процесса выполняются, а ещё 4 стоят в очереди ожидания CPU.</li>\n      </ul>\n    </li>\n  </ul>\n</div>\n\n<div class=\"theory-section\">\n  <h4>2. Шкала приоритетов <code>nice</code> и утилита <code>renice</code> (LPIC-1 103.6)</h4>\n  <p>Диапазон значений <code>nice</code> лежит строго <strong>от -20 до +19</strong>:</p>\n  <ul>\n    <li><code><strong>-20</strong></code>: <strong>Наивысший приоритет (Highest Priority)</strong>. Процесс с минимальной скромностью — получает максимум времени процессора. Отрицательные значения может выставлять <strong>ИСКЛЮЧИТЕЛЬНО суперпользователь root</strong>!</li>\n    <li><code><strong>0</strong></code>: Стандартный приоритет по умолчанию.</li>\n    <li><code><strong>+19</strong></code>: <strong>Минимальный приоритет (Lowest Priority)</strong>. Максимальная скромность: выполняется только когда CPU свободен.</li>\n  </ul>\n  <p><strong>Утилиты управления приоритетом:</strong></p>\n  <ul>\n    <li><code>nice -n 10 ./backup.sh</code> — запустить <em>новый</em> процесс с заданным nice.</li>\n    <li><code><strong>renice -n 15 -p 842</strong></code> — изменить приоритет <strong>УЖЕ РАБОТАЮЩЕГО процесса</strong> с PID 842!</li>\n  </ul>\n</div>\n\n<div class=\"theory-section\">\n  <h4>3. Фоновый режим <code>&</code>, просмотр <code>jobs</code> и неубиваемый <code>nohup</code></h4>\n  <ul>\n    <li><code>./backup.sh &</code> — амперсанд <code>&</code> в конце отправляет задачу в фон (background).</li>\n    <li><code>jobs</code> — список фоновых задач сессии.</li>\n    <li><code>fg %1</code> — вернуть задачу №1 на передний план.</li>\n  </ul>\n  <p><strong>Защита от обрыва SSH (утилита <code>nohup</code>):</strong> При закрытии терминала ядро шлёт дочерним процессам сигнал <strong>SIGHUP (Hang Up)</strong>, и они умирают. Утилита <code>nohup ./backup.sh &</code> глушит сигнал SIGHUP, позволяя процессу спокойно доработать до конца!</p>\n</div>\n"
      },
      {
        "type": "cmd_anatomy",
        "cmd": "nohup /root/backup.sh > /var/log/backup.log 2>&1 &",
        "desc": "Запуск тяжелого бэкапа в фоновом режиме с защитой от обрыва SSH (nohup) и перенаправлением всех логов и ошибок в единый файл",
        "output": "[1] 8422\n[1]+ Running nohup /root/backup.sh > /var/log/backup.log 2>&1 &",
        "notes": [
          "Load Average показывает среднюю длину очереди к CPU за 1, 5 и 15 минут",
          "Утилита ps aux выводит полный список процессов с их PID и расходом CPU/RAM",
          "Шкала nice лежит от -20 (максимальный приоритет) до +19 (минимальный)",
          "Команда renice меняет приоритет уже запущенного процесса по его PID",
          "nohup глушит сигнал SIGHUP при разрыве соединения SSH"
        ]
      },
      {
        "type": "task_ref",
        "taskId": "t10n_4"
      },
      {
        "type": "task_ref",
        "taskId": "t10n_1"
      },
      {
        "type": "step_head",
        "step": 2,
        "title": "Шаг 2. Сигналы Процессов в Linux: SIGTERM (15) vs SIGKILL (9) и SIGHUP (1)",
        "roadmap": "roadmap.sh: Linux Signals & Process Control"
      },
      {
        "type": "dialog",
        "char": "diego",
        "text": "Многие новички наивно думают, что команда <code>kill</code> — это какой-то пулемёт для расстрела программ. Ошибка! Команда <code>kill</code> — это почтальон. Она отправляет процессу системный **сигнал (сообщение)**.<br/><br/>А вот какой именно сигнал отправить — решает сисадмин! Если отправить вежливый сигнал 15 (SIGTERM), сервис аккуратно закроет файлы и базы данных. А если влепить сигнал 9 (SIGKILL), ядро Linux мгновенно сотрёт процесс из памяти без шанса попрощаться!"
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Механизм сигналов Unix (POSIX Signals)</h4>\n  <p>Сигналы — это фундаментальный механизм межпроцессного взаимодействия (IPC). Ключевые сигналы на экзамене LPIC-1 (Тема 103.5):</p>\n  <ul>\n    <li><code><strong>1 — SIGHUP</strong></code> (Signal Hang Up, отбой связи):<br/>\n      Сетевые демоны (Nginx, sshd) используют его для <strong>мягкой перезагрузки конфигурации без остановки службы</strong>! Команда <code>kill -1 &lt;PID&gt;</code> или <code>kill -HUP &lt;PID&gt;</code> заставляет Nginx перечитать конфиг на лету, не сбросив активных клиентов.\n    </li>\n    <li><code><strong>2 — SIGINT</strong></code> (Signal Interrupt): Сигнал прерывания по нажатию <strong>Ctrl + C</strong> в терминале.</li>\n    <li><code><strong>9 — SIGKILL</strong></code> (Принудительное убийство):<br/>\n      <strong>Самый беспощадный сигнал! Процесс НЕ МОЖЕТ перехватить, проигнорировать или заблокировать сигнал SIGKILL.</strong> Ядро мгновенно стирает процесс из памяти. Используется только против зависших намертво зомби или майнеров.\n    </li>\n    <li><code><strong>15 — SIGTERM</strong></code> (Signal Terminate, вежливое завершение):<br/>\n      <strong>СИГНАЛ ПО УМОЛЧАНИЮ!</strong> Если ты пишешь команду <code>kill &lt;PID&gt;</code> БЕЗ указания номера или имени сигнала, отправляется именно сигнал <strong>15 (SIGTERM)</strong>.<br/>\n      Это цивилизованная просьба операционной системы завершить работу с сохранением данных.\n    </li>\n    <li><code><strong>19 — SIGSTOP</strong></code>: Заморозка процесса (пауза ядра, как и SIGKILL нельзя заблокировать, Ctrl + Z).</li>\n  </ul>\n</div>\n"
      },
      {
        "type": "diagram",
        "text": "\n  СВОДНАЯ ТАБЛИЦА СИГНАЛОВ LINUX (LPIC-1 103.5):\n  =============================================================================\n  Номер │ Имя     │ Как отправить            │ Поведение и реакция процесса\n  ──────┼─────────┼──────────────────────────┼─────────────────────────────────\n    1   │ SIGHUP  │ kill -1 PID / kill -HUP  │ Мягкий перечит конфига без рестарта\n    2   │ SIGINT  │ Ctrl + C в терминале     │ Прерывание процесса пользователем\n    9   │ SIGKILL │ kill -9 PID / kill -KILL │ МГНОВЕННАЯ СМЕРТЬ! Нельзя блокировать!\n   15   │ SIGTERM │ kill PID (ПО УМОЛЧАНИЮ!) │ Вежливое завершение с сохранением\n   18   │ SIGCONT │ kill -18 PID / fg        │ Продолжить выполнение с паузы\n   19   │ SIGSTOP │ Ctrl + Z в терминале     │ Заморозить процесс (пауза ядра)\n  =============================================================================\n"
      },
      {
        "type": "task_ref",
        "taskId": "t5_2"
      },
      {
        "type": "step_head",
        "step": 3,
        "title": "Шаг 3. Инженерный Пульт: Управление Жизненным Циклом Процессов",
        "roadmap": "roadmap.sh: Production Process Troubleshooting"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "На боевом сервере ты обязан мгновенно читать Load Average, понимать сигналы и защищать бэкапы от обрыва связи! Давай проверим твою интуицию на реальном стенде."
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Золотые правила системного администратора по процессам:</h4>\n  <ul>\n    <li>Всегда сопоставляй Load Average с числом ядер: значение выше числа ядер означает очередь к CPU!</li>\n    <li>Приоритет: значение nice <code>-20</code> — максимальная скорость для критических баз данных, а <code>+19</code> — тихий фоновый режим для бэкапов.</li>\n    <li>Перезагрузка конфигов демонов: сначала посылаем <code>kill -1 (SIGHUP)</code>, а не перезапускаем службу целиком.</li>\n    <li>Тяжёлые скрипты в терминале: всегда оборачиваем в <code>nohup ... &</code>!</li>\n  </ul>\n</div>\n"
      },
      {
        "type": "task_ref",
        "taskId": "t10n_3"
      },
      {
        "type": "step_head",
        "step": 4,
        "title": "Шаг 4. Экзаменационный Тренажёр LPIC-1 [103.5 & 103.6] & Словарь Терминов",
        "roadmap": "LPIC-1 Exam Prep [103.5 & 103.6]"
      },
      {
        "type": "dialog",
        "char": "smith",
        "text": "Экзаменаторы LPIC-1 обожают три вопроса: диапазон nice (-20..19), сигнал по умолчанию (15 SIGTERM) и команда смены приоритета работающего процесса (renice). Закрепляем материал!"
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Чек-лист правильных ответов экзамена LPIC-1:</h4>\n  <ul>\n    <li><strong>Default signal sent by kill:</strong> <code>SIGTERM (15)</code>.</li>\n    <li><strong>Range of nice values:</strong> <code>-20 to 19</code>, where <code>-20</code> is the HIGHEST priority.</li>\n    <li><strong>Alter priority of running process:</strong> <code>renice</code>.</li>\n    <li><strong>Signals that cannot be caught or ignored:</strong> <code>SIGKILL (9)</code> and <code>SIGSTOP (19)</code>.</li>\n  </ul>\n</div>\n"
      },
      {
        "type": "vocab"
      },
      {
        "type": "task_ref",
        "taskId": "t10n_2"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "Критическая перегрузка ноды, боец! Процессор раскалился, кулеры ревут на 100%! Включаем антикризисный протокол 120%: проверь показатели нагрузки командой <code>uptime</code>, найди в выводе <code>ps aux</code> скрытый майнер и немедленно прибей его сигналом <code>kill -9 6660</code>! Затем охлади перегруженную СУБД командой <code>renice -n 15 -p 842</code> и запусти спасительный бэкап в фоне <code>nohup /root/backup.sh &</code>. Спаси сервер от термоудара!"
      },
      {
        "type": "task_ref",
        "taskId": "t10_boss"
      }
    ],
    "vocab": [
      {
        "en": "signal",
        "pron": "[си́гнал]",
        "ru": "системный сигнал межпроцессного взаимодействия (SIGTERM, SIGKILL, SIGHUP)",
        "assoc": "Команда kill отправляет процессам системные сигналы по их номеру PID"
      },
      {
        "en": "default",
        "pron": "[дифо́лт]",
        "ru": "по умолчанию / базовое значение",
        "assoc": "By default команда kill отправляет сигнал SIGTERM (15)"
      },
      {
        "en": "priority",
        "pron": "[прайо́рити]",
        "ru": "приоритет планировщика процессора (шкала nice от -20 до +19)",
        "assoc": "Highest scheduling priority обеспечивается значением nice -20"
      },
      {
        "en": "available",
        "pron": "[эвэ́йлэбл]",
        "ru": "доступный / имеющийся в системе",
        "assoc": "Range of nice values available on Linux — диапазон доступных значений nice"
      },
      {
        "en": "background",
        "pron": "[бэ́кграунд]",
        "ru": "фоновый режим работы программы (символ & в конце команды)",
        "assoc": "Запуск в background освобождает командную строку для ввода других команд"
      },
      {
        "en": "hangup",
        "pron": "[хэ́нгап]",
        "ru": "обрыв соединения / завершение сеанса связи (сигнал SIGHUP и утилита nohup)",
        "assoc": "Утилита nohup игнорирует сигнал hangup при разрыве SSH-сессии"
      }
    ],
    "tasks": [
      {
        "id": "t10n_4",
        "type": "lpic_fill",
        "title": "Ввод ответа LPIC-1 [103.6]: Изменение приоритета работающего процесса",
        "matter": 15,
        "char": "smith",
        "story": "Вопрос с открытым вводом LPIC-1: какая команда изменяет приоритет nice уже запущенного процесса?",
        "enQuestion": "<w k='which'>Which</w> <w k='command'>command</w> is used to alter the scheduling <w k='priority'>priority</w> of an ALREADY RUNNING <w k='process'>process</w> by its PID? (<w k='specify'>Specify</w> <w k='only'>ONLY</w> the <w k='command'>command</w> name.)",
        "acceptedAnswers": [
          "renice",
          "/usr/bin/renice"
        ],
        "placeholder": "Имя команды...",
        "explainRu": "Блестяще! Команда `renice` меняет приоритет уже работающего процесса по его PID (например, `renice -n 15 -p 842`), тогда как утилита `nice` используется только в момент первичного старта процесса.",
        "requirements": [
          "Вспомни команду изменения приоритета для уже запущенного процесса (running process).",
          "Введи только имя команды."
        ],
        "hint": "Шесть букв: `renice`!",
        "difficulty": "easy"
      },
      {
        "id": "t10n_1",
        "type": "terminal",
        "title": "Укрощение нагрузки: проверь Load Average, понизь приоритет и запусти бэкап через nohup",
        "matter": 30,
        "char": "diego",
        "story": "Сервер гудит под нагрузкой! Проверь среднюю загрузку ядер через `uptime`, понизь приоритет тяжёлого процесса `842` командой `renice -n 15 -p 842`, а затем запусти долгий бэкап в фоне через `nohup /root/backup.sh &`, чтобы он не оборвался при разрыве SSH!",
        "requirements": [
          "Проверь Load Average командой `uptime`.",
          "Измени приоритет процесса командой `renice -n 15 -p 842`.",
          "Запусти фоновый бэкап командой `nohup /root/backup.sh &` и проверь `jobs`."
        ],
        "chips": [
          "uptime",
          "ps aux",
          "renice -n 15 -p 842",
          "nohup /root/backup.sh &",
          "jobs"
        ],
        "checkRules": [
          "cmd:uptime",
          "cmd:renice",
          "bg_job_started"
        ],
        "hint": "Выполни в терминале `uptime`, затем `renice -n 15 -p 842`, `nohup /root/backup.sh &` и `jobs`!",
        "difficulty": "medium"
      },
      {
        "id": "t5_2",
        "type": "lpic_en",
        "title": "Тренажёр LPIC-1 [103.5]: Сигнал по умолчанию в команде kill",
        "matter": 20,
        "char": "smith",
        "story": "Этот вопрос обожают составители LPIC-1: какой сигнал летит процессу, если админ написал просто `kill 1234` БЕЗ флага `-9`?",
        "enQuestion": "<w k='which'>Which</w> <w k='signal'>signal</w> is sent by the `kill` <w k='command'>command</w> by <w k='default'>default</w> if no <w k='signal'>signal</w> number or name is specified?",
        "options": [
          {
            "val": "a",
            "text": "SIGKILL (9)"
          },
          {
            "val": "b",
            "text": "SIGTERM (15)"
          },
          {
            "val": "c",
            "text": "SIGHUP (1)"
          },
          {
            "val": "d",
            "text": "SIGINT (2)"
          }
        ],
        "correct": "b",
        "explainRu": "Красавчик! Без флагов `kill` вежливый — он отправляет `SIGTERM (15)`, давая базе или сервису спокойно дописать файлы перед выходом.",
        "requirements": [
          "Вспомни разницу между вежливым завершением по умолчанию и жёстким `-9`.",
          "Выбери сигнал по умолчанию для команды `kill`."
        ],
        "hint": "`TERM` = Terminate (вежливый сигнал `15` по умолчанию)!",
        "difficulty": "easy"
      },
      {
        "id": "t10n_3",
        "type": "builder",
        "title": "Инженерный Пульт: Load Average, Приоритеты nice, Сигналы и Защита nohup",
        "matter": 20,
        "char": "batya",
        "story": "Собери полную конфигурацию мониторинга и управления процессами без сбоев!",
        "requirements": [
          "Расшифруй значение Load Average 8.00 на 4-ядерном сервере.",
          "Определи значение nice для предоставления процессу наивысшего приоритета к CPU.",
          "Выбери сигнал для мягкой перезагрузки конфигурации демона без рестарта.",
          "Объясни роль утилиты nohup при отключении администратора по SSH."
        ],
        "fields": [
          {
            "id": "la_meaning",
            "label": "1. Команда uptime на 4-ядерном CPU показала Load Average: 8.00, 4.00, 2.00. Что происходит с сервером прямо сейчас (за 1 минуту)?",
            "options": [
              {
                "val": "overload",
                "text": "Сервер перегружен ровно в 2 раза: 4 процесса работают, а еще 4 стоят в очереди ожидания CPU"
              },
              {
                "val": "idle",
                "text": "Сервер простаивает на 50%"
              },
              {
                "val": "normal",
                "text": "Все процессы завершены"
              }
            ],
            "correct": "overload"
          },
          {
            "id": "nice_highest",
            "label": "2. Какое значение шкалы nice даёт процессу НАИВЫСШИЙ приоритет планировщика (highest priority)?",
            "options": [
              {
                "val": "minus_20",
                "text": "-20 (максимальная наглость к CPU, может выставлять только root)"
              },
              {
                "val": "plus_19",
                "text": "+19 (максимальная скромность, минимальный приоритет)"
              },
              {
                "val": "zero",
                "text": "0 (стандартный приоритет)"
              }
            ],
            "correct": "minus_20"
          },
          {
            "id": "signal_reload",
            "label": "3. Какой сигнал (номер или имя) отправляют Nginx для мягкого перечитывания конфига без разрыва соединений?",
            "options": [
              {
                "val": "sighup",
                "text": "SIGHUP (сигнал 1) — мягкий reload конфигурации"
              },
              {
                "val": "sigkill",
                "text": "SIGKILL (сигнал 9) — мгновенная смерть"
              },
              {
                "val": "sigterm",
                "text": "SIGTERM (сигнал 15) — завершение работы"
              }
            ],
            "correct": "sighup"
          },
          {
            "id": "nohup_role",
            "label": "4. От чего защищает процесс утилита `nohup` при запуске фонового скрипта?",
            "options": [
              {
                "val": "sighup_block",
                "text": "Она глушит сигнал SIGHUP, не давая ядру убить процесс при закрытии терминала или обрыве SSH"
              },
              {
                "val": "sigkill_block",
                "text": "Она защищает процесс от сигнала SIGKILL (9)"
              }
            ],
            "correct": "sighup_block"
          }
        ],
        "hint": "8 процессов на 4 ядрах = перегруз в 2 раза, nice -20 = высший приоритет, SIGHUP (1) = reload, nohup глушит SIGHUP!",
        "difficulty": "medium"
      },
      {
        "id": "t10n_2",
        "type": "lpic_en",
        "title": "Тренажёр LPIC-1 [103.6]: Диапазон приоритетов nice в Linux",
        "matter": 20,
        "char": "smith",
        "story": "Этот диапазон гарантированно спросят на экзамене: от скольки до скольки и где плюс, а где минус!",
        "enQuestion": "What range of `nice` values is <w k='available'>available</w> on Linux, and <w k='which'>which</w> value gives a <w k='process'>process</w> the HIGHEST scheduling priority?",
        "options": [
          {
            "val": "a",
            "text": "0 to 100, where 100 is the highest priority"
          },
          {
            "val": "b",
            "text": "-20 to 19, where -20 is the highest priority"
          },
          {
            "val": "c",
            "text": "-20 to 19, where 19 is the highest priority"
          },
          {
            "val": "d",
            "text": "1 to 99, where 1 is the highest priority"
          }
        ],
        "correct": "b",
        "explainRu": "Отлично! В Linux приоритеты nice лежат в диапазоне от -20 (самый высокий приоритет / максимальная наглость к CPU) до +19 (минимальный приоритет / максимальная скромность). Запомни: минус = меньше скромности = выше приоритет!",
        "requirements": [
          "Вспомни диапазон значений nice.",
          "Определи, какое значение даёт наивысший приоритет (HIGHEST scheduling priority)."
        ],
        "hint": "От -20 до +19, где -20 — самый высокий приоритет (вариант B)!",
        "difficulty": "easy"
      },
      {
        "id": "t10_boss",
        "type": "terminal",
        "title": "БОСС 120%: Ликвидация криптомайнера и аварийный бэкап ноды",
        "matter": 40,
        "difficulty": "hard",
        "char": "batya",
        "story": "Сервер атакован: злоумышленники внедрили майнер криптовалюты, который утилизирует все процессорные ядра. Защити инфраструктуру, восстанови нормальный тепловой режим и обеспечь сохранность данных.",
        "requirements": [
          "Оцени текущую деградацию производительности и значение Load Average с помощью команды просмотра времени работы системы.",
          "Выяви вредоносный процесс в таблице процессов и безвозвратно уничтожь криптомайнер с PID `6660` сигналом SIGKILL.",
          "Понизь приоритет планировщика для процесса СУБД с PID `842` до щадящего значения `15`.",
          "Запусти процедуру резервного копирования `/root/backup.sh` в изолированном фоновом режиме, защищённом от закрытия терминала."
        ],
        "chips": [
          "uptime",
          "ps aux",
          "kill -9 6660",
          "renice -n 15 -p 842",
          "nohup /root/backup.sh &",
          "jobs"
        ],
        "checkRules": [
          "cmd:uptime",
          "proc_killed:6660",
          "cmd:renice",
          "bg_job_started"
        ],
        "hint": "Выполни в терминале: 1) `uptime`, 2) `ps aux`, 3) `kill -9 6660`, 4) `renice -n 15 -p 842`, 5) `nohup /root/backup.sh &` и жми «✅ Проверка»!"
      }
    ]
  },
  {
    "level": 11,
    "questId": "q_linux",
    "cost": 55,
    "title": "Магия Прав chmod (755/750/644/600), Владельцы chown, umask, Спецбиты и Ссылки ln -s",
    "shortDesc": "Восьмеричная математика прав r=4, w=2, x=1, почему SSH требует 600, маска создания файлов umask, спецбиты SUID/SGID/Sticky (1777 /tmp) и разница между hardlink и symlink.",
    "blocks": [
      {
        "type": "step_head",
        "step": 1,
        "title": "Шаг 1. Восьмеричная Математика Прав chmod (r=4, w=2, x=1) и Секрет Исполнения Скриптов",
        "roadmap": "roadmap.sh: File Permissions & Ownership"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "Каждый новичок при виде загадочных символов <code>-rwxr-xr-x</code> в выводе <code>ls -l</code> впадает в ступор. Но за этой строкой скрывается предельно простая и гениальная восьмеричная арифметика Unix 1970-х годов!<br/><br/>Сейчас мы разберём триады прав, научимся мгновенно переводить буквы в трёхзначные цифры <strong>755, 750, 644, 600</strong> и выясним, почему для запуска обычного скрипта Bash недостаточно прав <code>111</code>!"
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Триады субъектов и веса прав (4, 2, 1)</h4>\n  <p>В Linux у каждого файла три категории субъектов: <strong>User (u, владелец)</strong>, <strong>Group (g, группа)</strong> и <strong>Others (o, остальные)</strong>.</p>\n  <p>Для каждой категории задаются три базовых бита:</p>\n  <ul>\n    <li><code><strong>r</strong></code> — <strong>Read (чтение) = 4</strong></li>\n    <li><code><strong>w</strong></code> — <strong>Write (запись) = 2</strong></li>\n    <li><code><strong>x</strong></code> — <strong>eXecute (исполнение / вход в каталог) = 1</strong></li>\n    <li><code><strong>-</strong></code> — <strong>Нет прав = 0</strong></li>\n  </ul>\n  <p>Сумма определяет права категории: <code>rwx = 4+2+1 = 7</code>, <code>rw- = 4+2 = 6</code>, <code>r-x = 4+1 = 5</code>.</p>\n</div>\n\n<div class=\"theory-section\">\n  <h4>2. Золотые комбинации прав:</h4>\n  <ul>\n    <li><code><strong>600 (rw-------)</strong></code>: Только владелец читает и пишет. <strong>ОБЯЗАТЕЛЬНО для приватных ключей SSH (~/.ssh/id_ed25519)</strong>! Иначе OpenSSH откажется подключаться с ошибкой <em>permissions are too open</em>!</li>\n    <li><code><strong>644 (rw-r--r--)</strong></code>: Стандарт для обычных файлов, конфигураций и веб-страниц.</li>\n    <li><code><strong>755 (rwxr-xr-x)</strong></code>: Стандарт для исполняемых скриптов и каталогов.</li>\n    <li><code><strong>750 (rwxr-x---)</strong></code>: Защищённые папки отделов — весь мир (others) закрыт наглухо (0).</li>\n  </ul>\n</div>\n\n<div class=\"theory-section\">\n  <h4>3. Почему для скрипта Bash недостаточно <code>chmod 111</code> (--x--x--x)?</h4>\n  <p>Бинарной скомпилированной программе на Си для старта достаточно одного бита <code>x=1</code>. <strong>Но скрипт Bash — это обычный текстовый файл!</strong></p>\n  <p>Когда ты вызываешь <code>./script.sh</code>, ядро видит заголовок <code>#!/bin/bash</code> и запускает интерпретатор Bash. А интерпретатору Bash жизненно необходимо <strong>прочитать (read)</strong> команды из этого файла! Если у файла есть бит <code>x=1</code>, но нет бита <code>r=4</code>, Bash не сможет прочитать скрипт и выдаст фатальную ошибку: <em>«Permission denied»</em>! Поэтому скриптам всегда дают права <strong>чтения + исполнения: r-x (4+1=5)</strong> — то есть <strong>755</strong> или <strong>750</strong>!</p>\n</div>\n"
      },
      {
        "type": "task_ref",
        "taskId": "t11_e0"
      },
      {
        "type": "task_ref",
        "taskId": "t6_4"
      },
      {
        "type": "step_head",
        "step": 2,
        "title": "Шаг 2. Практикум по Правам: Защита SSH-Ключа (600), Скрипт (755) и Симлинк",
        "roadmap": "roadmap.sh: Practical Permission Hardening"
      },
      {
        "type": "dialog",
        "char": "diego",
        "text": "Срочный тикет от службы безопасности! Джуниор залил на сервер приватный ключ SSH с правами 644, а скрипт деплоя забыл сделать исполняемым. Спасаем продакшен!"
      },
      {
        "type": "cmd_anatomy",
        "cmd": "chmod 600 id_ed25519 && chmod 755 deploy.sh && ln -s /root/deploy.sh /root/run",
        "desc": "Защищает приватный SSH-ключ строгими правами 600, делает скрипт деплоя исполняемым (755) и создаёт символическую ссылку /root/run",
        "output": "-rw------- 1 root root 411 Nov 15 04:30 id_ed25519\n-rwxr-xr-x 1 root root 289 Nov 15 04:31 deploy.sh\nlrwxrwxrwx 1 root root  15 Nov 15 04:32 /root/run -> /root/deploy.sh",
        "notes": [
          "Права 600 (rw-------) защищают приватные ключи от чтения посторонними",
          "Права 755 (rwxr-xr-x) позволяют запускать скрипт интерпретатором",
          "ln -s создаёт символическую ссылку на файл"
        ]
      },
      {
        "type": "task_ref",
        "taskId": "t6_1"
      },
      {
        "type": "step_head",
        "step": 3,
        "title": "Шаг 3. Системная Маска umask: Автоматический Расчёт Прав Новых Файлов",
        "roadmap": "LPIC-1 Exam Prep [104.5]: umask Calculations"
      },
      {
        "type": "dialog",
        "char": "smith",
        "text": "Когда ты создаёшь файл через <code>touch file.txt</code>, он автоматически получает права <code>644</code>. А когда папку через <code>mkdir</code> — <code>755</code>. Откуда берутся эти цифры? Их вычисляет системная маска <strong>umask</strong>!"
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Математика системной маски <code>umask</code></h4>\n  <p>При создании нового объекта ядро запрашивает базовые максимальные права:</p>\n  <ul>\n    <li>Для каталогов базовая маска равна <code><strong>777 (rwxrwxrwx)</strong></code>.</li>\n    <li>Для обычных файлов базовая маска равна <code><strong>666 (rw-rw-rw-)</strong></code> (бит исполнения <code>x</code> ядро никогда не выдаёт файлам по умолчанию в целях безопасности!).</li>\n  </ul>\n  <p>Затем система вычитает биты активной маски <strong>umask</strong> (по умолчанию в Linux установлена <code><strong>022</strong></code>):</p>\n  <ul>\n    <li><strong>Для нового каталога:</strong> <code>777 - 022 = 755 (rwxr-xr-x)</code>.</li>\n    <li><strong>Для нового файла:</strong> <code>666 - 022 = <strong>644 (rw-r--r--)</strong></code>!</li>\n  </ul>\n  <p><strong>Параноидальный режим безопасности:</strong> Если выполнить <code>umask 077</code>, то новые файлы будут создаваться с правами <code>666 - 077 = 600 (rw-------)</code>, а каталоги — <code>777 - 077 = 700 (rwx------)</code>, полностью блокируя доступ всем остальным пользователям!</p>\n</div>\n"
      },
      {
        "type": "task_ref",
        "taskId": "t6_5"
      },
      {
        "type": "step_head",
        "step": 4,
        "title": "Шаг 4. Специальные Биты Доступа: SUID (4000), SGID (2000) и Sticky Bit (1000)",
        "roadmap": "roadmap.sh: Advanced Special Permissions"
      },
      {
        "type": "dialog",
        "char": "kira",
        "text": "Обычных <code>rwx</code> недостаточно для сложных корпоративных систем. В Linux есть три спецбита старшего октета, которые меняют правила игры: <strong>SUID, SGID и Sticky Bit</strong>!"
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Три специальных бита доступа:</h4>\n  <ul>\n    <li><code><strong>1. SUID (Set User ID — вес 4000)</strong></code>:<br/>\n      Устанавливается на исполняемые бинарные файлы: <code>chmod u+s /usr/bin/passwd</code> (права: <code>-rwsr-xr-x</code> — буква <code>s</code> вместо <code>x</code> владельца).<br/>\n      <strong>Что делает:</strong> Процесс запускается <strong>с правами ВЛАДЕЛЬЦА ФАЙЛА (root)</strong>, а не запустившего юзера! Это позволяет обычным пользователям безопасно менять пароль в защищённом файле <code>/etc/shadow</code> через утилиту <code>passwd</code>.\n    </li>\n    <li><code><strong>2. SGID (Set Group ID — вес 2000)</strong></code>:<br/>\n      Устанавливается на каталог совместной работы: <code>chmod g+s /data/shared</code> (права: <code>drwxrwsr-x</code>).<br/>\n      <strong>Что делает:</strong> Любой новый файл, созданный внутри папки, <strong>автоматически наследует группу этого каталога</strong>, а не группу своего создателя!\n    </li>\n    <li><code><strong>3. Sticky Bit (Бит закрепления — вес 1000)</strong></code>:<br/>\n      Устанавливается на общедоступную свалку <code>/tmp</code>: <code>chmod 1777 /tmp</code> (права: <code>drwxrwxrwt</code> — буква <code>t</code> на конце).<br/>\n      <strong>Что делает:</strong> Создавать файлы в <code>/tmp</code> могут все. <strong>Но удалить или переименовать чужой файл может ТОЛЬКО его непосредственный владелец или root!</strong>\n    </li>\n  </ul>\n</div>\n"
      },
      {
        "type": "diagram",
        "text": "\n  СВОДНАЯ ТАБЛИЦА СПЕЦИАЛЬНЫХ БИТОВ ДОСТУПА (LPIC-1 104.5):\n  =============================================================================\n  Спецбит    │ Вес  │ Права в ls -l │ Где ставится │ Реальная роль в продакшене\n  ───────────┼──────┼───────────────┼──────────────┼───────────────────────────\n  SUID       │ 4000 │ -rwsr-xr-x    │ На бинарник  │ Запуск с правами владельца (/usr/bin/passwd)\n  SGID       │ 2000 │ drwxrwsr-x    │ На каталог   │ Новые файлы наследуют группу папки\n  Sticky Bit │ 1000 │ drwxrwxrwt    │ На каталог   │ Запрет удаления чужих файлов (/tmp)\n  =============================================================================\n"
      },
      {
        "type": "task_ref",
        "taskId": "t6_6"
      },
      {
        "type": "step_head",
        "step": 5,
        "title": "Шаг 5. Битва Ссылок: Жёсткие (Hard Links) против Символических (Symlinks ln -s)",
        "roadmap": "roadmap.sh: Inodes & Links"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "Финальный рубеж Квеста 2 — ссылки (тема 104.6 LPIC-1). Жёсткая ссылка (Hard Link) или символическая (Symlink)? Что произойдёт с файлом, если стереть оригинал? Разбираем анатомию inode!"
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Индексный дескриптор <code>inode</code> и Жёсткие ссылки (Hard Links)</h4>\n  <p>В Linux имя файла — это всего лишь текстовый ярлык в каталоге, указывающий на номер <strong>inode</strong> (индексный дескриптор с метаданными и блоками на диске).</p>\n  <p>Жёсткая ссылка создаётся командой <code>ln &lt;оригинал&gt; &lt;ссылка&gt;</code> (БЕЗ ключа <code>-s</code>):</p>\n  <ul>\n    <li>Жёсткая ссылка указывает <strong>на тот же самый номер inode</strong>! Это второе полноправное имя того же самого файла.</li>\n    <li><strong>Что будет при удалении оригинала через <code>rm</code>?</strong> Данные <strong>НЕ удалятся</strong>! Счётчик ссылок на данный inode уменьшится с 2 до 1. Файл останется полностью доступен через жёсткую ссылку!</li>\n    <li><strong>Ограничения Hard Link:</strong> нельзя делать на каталоги и нельзя создавать между разными дисками/разделами.</li>\n  </ul>\n</div>\n\n<div class=\"theory-section\">\n  <h4>2. Символические ссылки (Symbolic Links / Symlinks)</h4>\n  <p>Символическая ссылка создаётся с флагом <code><strong>ln -s &lt;цель&gt; &lt;ссылка&gt;</strong></code>:</p>\n  <ul>\n    <li>Это отдельный самостоятельный файл со своим номером inode, внутри которого записан просто <strong>текстовый путь к цели</strong> (как ярлык <code>.lnk</code> в Windows).</li>\n    <li><strong>Преимущества:</strong> Работают между разными дисками и файловыми системами, можно создавать на <strong>каталоги</strong>!</li>\n    <li><strong>Если удалить оригинал:</strong> Символическая ссылка превращается в «битую» (broken symlink), указывающую в пустоту.</li>\n  </ul>\n</div>\n"
      },
      {
        "type": "task_ref",
        "taskId": "t6_7"
      },
      {
        "type": "step_head",
        "step": 6,
        "title": "Шаг 6. Экзаменационный Тренажёр LPIC-1 [104.5 & 104.6] & Словарь Терминов",
        "roadmap": "LPIC-1 Exam Prep [104.5 & 104.6]"
      },
      {
        "type": "dialog",
        "char": "smith",
        "text": "Финал Квеста 2! Закрепляем ключевые формулировки сертификации: строгие права chmod 600 для ключей и синтаксис команды ln -s."
      },
      {
        "type": "theory",
        "html": "\n<div class=\"theory-section\">\n  <h4>1. Чек-лист экзамена LPIC-1 (Темы 104.5 и 104.6):</h4>\n  <ul>\n    <li><strong>Owner read+write, others no access:</strong> <code>chmod 600 file</code>.</li>\n    <li><strong>Create symbolic link:</strong> <code>ln -s /target /linkname</code> (сначала оригинал, потом ссылка!).</li>\n    <li><strong>Default regular file permissions with umask 022:</strong> <code>644</code> (666 - 022 = 644).</li>\n    <li><strong>Set User ID weight:</strong> <code>4000</code>.</li>\n    <li><strong>Sticky bit weight:</strong> <code>1000</code> (chmod 1777 /tmp).</li>\n  </ul>\n</div>\n"
      },
      {
        "type": "vocab"
      },
      {
        "type": "task_ref",
        "taskId": "t6_2"
      },
      {
        "type": "task_ref",
        "taskId": "t6_3"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "Финальный рубеж Квеста 2, боец! Перед тобой боевой деплой production-кластера в условиях строгого аудита безопасности. Закрой приватный SSH-ключ командой <code>chmod 600 id_ed25519</code>, сделай исполняемым скрипт релиза <code>chmod 755 deploy.sh</code>, запусти сам деплой <code>./deploy.sh</code> и пробрось быструю символическую ссылку на системный лог <code>ln -s /var/log/syslog /root/syslog-link</code>. Заверши этот квест как абсолютный чемпион!"
      },
      {
        "type": "task_ref",
        "taskId": "t11_boss"
      }
    ],
    "vocab": [
      {
        "en": "permission",
        "pron": "[пёрми́шн]",
        "ru": "права доступа к файлу или каталогу (триады rwx)",
        "assoc": "Команда chmod управляет permissions для user, group и others"
      },
      {
        "en": "owner",
        "pron": "[о́унер]",
        "ru": "владелец файла (пользователь, создавший файл)",
        "assoc": "Команда chown переназначает owner файла новому пользователю"
      },
      {
        "en": "symbolic link",
        "pron": "[симбо́лик линк]",
        "ru": "символическая ссылка / ярлык пути к файлу (флаг ln -s)",
        "assoc": "Создаётся командой ln -s target link и может ссылаться на каталоги и другие разделы"
      },
      {
        "en": "hard link",
        "pron": "[хард линк]",
        "ru": "жёсткая ссылка (прямой указатель на тот же номер inode)",
        "assoc": "Создаётся командой ln без флага -s и не может пересекать границы разделов диска"
      },
      {
        "en": "special bits",
        "pron": "[спе́шл битс]",
        "ru": "специальные биты разрешений (SUID, SGID, Sticky Bit)",
        "assoc": "Биты 4000, 2000 и 1000 кардинально меняют права выполнения и удаления"
      },
      {
        "en": "execute",
        "pron": "[э́ксекьют]",
        "ru": "выполнять / исполнять программу (бит x с числовым весом 1)",
        "assoc": "Скрипт не запустится в терминале без флага execute (+x / 755)"
      }
    ],
    "tasks": [
      {
        "id": "t11_e0",
        "type": "builder",
        "title": "Экспресс-разминка: Восьмеричные веса прав (r, w, x)",
        "matter": 10,
        "difficulty": "easy",
        "char": "batya",
        "story": "Перед тем как рассчитывать маски доступа и права скриптов, за 3 секунды закрепи базовую арифметику Linux!",
        "fields": [
          {
            "id": "weight_r_w_x",
            "label": "Числовое значение полного доступа rwx (чтение 4 + запись 2 + выполнение 1):",
            "options": [
              {
                "val": "7",
                "label": "7 (4 + 2 + 1 = rwx)"
              },
              {
                "val": "6",
                "label": "6 (4 + 2 = rw-)"
              },
              {
                "val": "5",
                "label": "5 (4 + 1 = r-x)"
              },
              {
                "val": "4",
                "label": "4 (только чтение r--)"
              }
            ],
            "correct": "7"
          },
          {
            "id": "exec_bit",
            "label": "Бит, необходимый для возможности запуска исполняемого файла или скрипта:",
            "options": [
              {
                "val": "x",
                "label": "x (eXecute — выполнение, вес 1)"
              },
              {
                "val": "r",
                "label": "r (Read — чтение, вес 4)"
              },
              {
                "val": "w",
                "label": "w (Write — запись, вес 2)"
              },
              {
                "val": "s",
                "label": "s (Special — спецбит)"
              }
            ],
            "correct": "x"
          }
        ],
        "requirements": [
          "Вычисли сумму весов полного набора прав `rwx`.",
          "Укажи букву бита исполнения программы."
        ],
        "hint": "Чтение 4 + Запись 2 + Выполнение 1 = 7, а бит исполнения обозначается буквой `x`!"
      },
      {
        "id": "t6_4",
        "type": "builder",
        "title": "Инженерный Пульт: Восьмеричная Математика Прав и Секрет Исполнения Скриптов",
        "matter": 20,
        "char": "batya",
        "story": "Рассчитай восьмеричные права доступа и настрой безопасность сервера!",
        "requirements": [
          "Вычисли цифровое значение прав rw-r--r--.",
          "Определи права для каталога защищённого отдела (rwxr-x---).",
          "Укажи права для приватного ключа SSH (rw-------).",
          "Объясни, почему обычному Bash-скрипту недостаточно прав только на исполнение (chmod 111)."
        ],
        "fields": [
          {
            "id": "perm_644",
            "label": "1. Какие восьмеричные права соответствуют буквенной записи `rw-r--r--`?",
            "options": [
              {
                "val": "644",
                "text": "644 (Owner: 4+2=6, Group: 4, Others: 4)"
              },
              {
                "val": "755",
                "text": "755 (Owner: 7, Group: 5, Others: 5)"
              },
              {
                "val": "600",
                "text": "600 (Owner: 6, Group: 0, Others: 0)"
              }
            ],
            "correct": "644"
          },
          {
            "id": "perm_750",
            "label": "2. Какие права закрывают доступ всему миру, давая полный доступ владельцу и чтение/вход группе (rwxr-x---)?",
            "options": [
              {
                "val": "750",
                "text": "750 (Owner: 7, Group: 5, Others: 0)"
              },
              {
                "val": "755",
                "text": "755 (Others имеют доступ на чтение)"
              },
              {
                "val": "700",
                "text": "700 (Группа не имеет доступа)"
              }
            ],
            "correct": "750"
          },
          {
            "id": "perm_600",
            "label": "3. Какие строгие права обязан иметь приватный ключ SSH (~/.ssh/id_ed25519) для успешного подключения?",
            "options": [
              {
                "val": "600",
                "text": "600 (rw------- — только владелец может читать и писать)"
              },
              {
                "val": "644",
                "text": "644 (OpenSSH выдаст фатальную ошибку: permissions are too open!)"
              },
              {
                "val": "777",
                "text": "777 (Полный доступ всем)"
              }
            ],
            "correct": "600"
          },
          {
            "id": "why_rx_for_script",
            "label": "4. Почему Bash-скрипт не запустится при правах `chmod 111` (--x--x--x), хотя бит исполнения выставлен?",
            "options": [
              {
                "val": "read_needed",
                "text": "Скрипт — это текстовый файл: интерпретатору Bash обязательно нужен бит чтения r=4, чтобы прочесть команды из файла (нужно r-x = 5)!"
              },
              {
                "val": "binary_only",
                "text": "Bash вообще не умеет исполнять скрипты без компиляции"
              }
            ],
            "correct": "read_needed"
          }
        ],
        "hint": "4+2=6, чтение+вход = 5 (r-x), для приватного ключа — 600, а скрипту нужен r=4 для чтения команд!",
        "difficulty": "medium"
      },
      {
        "id": "t6_1",
        "type": "terminal",
        "title": "Спаси деплой: закрой приватный SSH-ключ, дай +x скрипту и создай симлинк",
        "matter": 30,
        "char": "diego",
        "story": "Разработчик залил в `/root` приватный SSH-ключ `id_ed25519` и скрипт `deploy.sh` с дырявыми правами `644`. Защити ключ (`600`), сделай скрипт исполняемым (`755`) и создай симлинк `ln -s /root/deploy.sh /root/run`!",
        "requirements": [
          "Проверь текущие права файлов командой `ls -l`.",
          "Закрой доступ посторонним к ключу `id_ed25519` (`chmod 600 id_ed25519`).",
          "Выдай скрипту `deploy.sh` права `755` (`chmod 755 deploy.sh`).",
          "Создай символическую ссылку `/root/run` на `/root/deploy.sh` (`ln -s /root/deploy.sh /root/run`)."
        ],
        "chips": [
          "ls -l",
          "chmod 600 id_ed25519",
          "chmod 755 deploy.sh",
          "ln -s /root/deploy.sh /root/run",
          "./deploy.sh"
        ],
        "hint": "По очереди выполни в терминале `ls -l`, `chmod 600 id_ed25519`, `chmod 755 deploy.sh`, `ln -s /root/deploy.sh /root/run` и жми «✅ Проверка»!",
        "checkRules": [
          "cmd:ls -l",
          "perm:id_ed25519:600",
          "perm:deploy.sh:755",
          "symlink:/root/run:/root/deploy.sh"
        ],
        "difficulty": "medium"
      },
      {
        "id": "t6_5",
        "type": "lpic_fill",
        "title": "Ввод ответа LPIC-1 [104.5]: Восьмеричные права файла при маске umask 022",
        "matter": 15,
        "char": "smith",
        "story": "Классический расчёт прав на экзамене LPIC-1: какая маска выставится новому обычному файлу?",
        "enQuestion": "If the current system `umask` is set to `022`, what octal <w k='permissions'>permissions</w> (3 digits) will be assigned by <w k='default'>default</w> to a newly created regular <w k='file'>file</w> (base `666`)?",
        "acceptedAnswers": [
          "644",
          "0644"
        ],
        "placeholder": "Например: 755",
        "explainRu": "Идеальный расчёт! Базовые права на новый файл — `666` (без права на исполнение). Вычитаем маску umask: `666 - 022 = 644` (rw-r--r--). Для папок расчёт был бы `777 - 022 = 755`.",
        "requirements": [
          "Вспомни базовые права для обычного файла (`666`).",
          "Вычти маску `022`: `666 - 022 = ?`.",
          "Введи 3 восьмеричные цифры прав."
        ],
        "hint": "666 минус 022 = `644`!",
        "difficulty": "easy"
      },
      {
        "id": "t6_6",
        "type": "builder",
        "title": "Инженерный Пульт: Специальные Биты Доступа (SUID, SGID, Sticky Bit)",
        "matter": 20,
        "char": "kira",
        "story": "Назначь правильные специальные биты старшего октета для каждого серверного сценария!",
        "requirements": [
          "Выбери спецбит для утилиты /usr/bin/passwd, позволяющий запускать её с правами root.",
          "Определи спецбит для каталога совместной разработки, чтобы новые файлы наследовали группу папки.",
          "Укажи назначение Sticky Bit (1777) на общедоступном каталоге /tmp."
        ],
        "fields": [
          {
            "id": "suid_bit",
            "label": "1. Какой специальный бит (вес 4000) установлен на /usr/bin/passwd, чтобы обычный пользователь мог менять свой пароль в /etc/shadow от имени root?",
            "options": [
              {
                "val": "suid",
                "text": "SUID (Set User ID) — выполнение процесса с полномочиями владельца файла"
              },
              {
                "val": "sgid",
                "text": "SGID — выполнение с группой файла"
              },
              {
                "val": "sticky",
                "text": "Sticky Bit — защита от записи"
              }
            ],
            "correct": "suid"
          },
          {
            "id": "sgid_bit",
            "label": "2. Какой специальный бит (вес 2000), установленный на каталог (chmod g+s), заставляет все новые файлы наследовать группу этого каталога?",
            "options": [
              {
                "val": "sgid",
                "text": "SGID (Set Group ID) — автонаследование группы каталога для совместной работы"
              },
              {
                "val": "suid",
                "text": "SUID — смена владельца на root"
              },
              {
                "val": "sticky",
                "text": "Sticky Bit — блокировка каталога"
              }
            ],
            "correct": "sgid"
          },
          {
            "id": "sticky_bit",
            "label": "3. Зачем на каталог /tmp выставляют права 1777 со Sticky Bit (буква t в drwxrwxrwt)?",
            "options": [
              {
                "val": "delete_protect",
                "text": "Писать могут все, но удалять или переименовывать файл может ТОЛЬКО его владелец или root"
              },
              {
                "val": "read_only",
                "text": "Каталог становится доступен только для чтения"
              }
            ],
            "correct": "delete_protect"
          }
        ],
        "hint": "Пароли — SUID (4000), общие группы — SGID (2000), защита от удаления в /tmp — Sticky Bit (1000 / 1777)!",
        "difficulty": "medium"
      },
      {
        "id": "t6_7",
        "type": "builder",
        "title": "Инженерный Пульт: Сравнение Жёстких (Hard) и Символических (Symlink) Ссылок",
        "matter": 15,
        "char": "batya",
        "story": "Разберись в поведении ссылок на уровне inode, чтобы не потерять данные при удалении!",
        "requirements": [
          "Определи, что произойдёт с данными жёсткой ссылки, если оригинальный файл удалить через rm.",
          "Выбери ключевое преимущество символической ссылки (ln -s) перед жёсткой."
        ],
        "fields": [
          {
            "id": "hardlink_delete",
            "label": "1. Что произойдёт с данными, если создать жёсткую ссылку (ln file.txt hard.lnk), а затем удалить исходный file.txt через rm?",
            "options": [
              {
                "val": "data_alive",
                "text": "Данные останутся полностью доступны через hard.lnk (у них общий inode, счетчик ссылок уменьшился с 2 до 1)"
              },
              {
                "val": "data_lost",
                "text": "Данные безвозвратно удалятся, а ссылка hard.lnk сломается"
              }
            ],
            "correct": "data_alive"
          },
          {
            "id": "symlink_features",
            "label": "2. Какое главное преимущество имеет символическая ссылка (ln -s) по сравнению с жёсткой?",
            "options": [
              {
                "val": "cross_fs_and_dirs",
                "text": "Символические ссылки могут указывать на каталоги и работать между разными дисками/разделами"
              },
              {
                "val": "faster",
                "text": "Символическая ссылка работает в 10 раз быстрее"
              }
            ],
            "correct": "cross_fs_and_dirs"
          }
        ],
        "hint": "У жёсткой ссылки общий inode — данные живы! А символическая умеет ссылаться на каталоги и другие разделы!",
        "difficulty": "easy"
      },
      {
        "id": "t6_2",
        "type": "lpic_en",
        "title": "Тренажёр LPIC-1 [104.5]: Перевод прав в цифры (rw-------)",
        "matter": 20,
        "char": "smith",
        "story": "Сложи 4 + 2 для владельца и нули для остальных!",
        "enQuestion": "<w k='which'>Which</w> <w k='command'>command</w> <w k='sets'>sets</w> <w k='permissions'>permissions</w> on `secret.key` so the <w k='owner'>owner</w> can <w k='read'>read</w> and <w k='write'>write</w>, while the <w k='group'>group</w> and <w k='others'>others</w> have NO access at <w k='all'>all</w>?",
        "options": [
          {
            "val": "a",
            "text": "chmod 755 secret.key"
          },
          {
            "val": "b",
            "text": "chmod 644 secret.key"
          },
          {
            "val": "c",
            "text": "chmod 600 secret.key"
          },
          {
            "val": "d",
            "text": "chown 600 secret.key"
          }
        ],
        "correct": "c",
        "explainRu": "Огонь! Owner: Read(4) + Write(2) = `6`. Group = `0`, Others = `0` -> `chmod 600` (не перепутай с `chown`, который меняет имя владельца!).",
        "requirements": [
          "Переведи условия для `owner`, `group` и `others`.",
          "Выбери верную команду `chmod`."
        ],
        "hint": "Read(4)+Write(2)=6, остальным 0 и 0 -> `chmod 600`!",
        "difficulty": "easy"
      },
      {
        "id": "t6_3",
        "type": "lpic_en",
        "title": "Тренажёр LPIC-1 [104.6]: Создание символической ссылки",
        "matter": 20,
        "char": "smith",
        "story": "Короткий и верный балл на экзамене LPIC-1:",
        "enQuestion": "<w k='which'>Which</w> <w k='command'>command</w> <w k='creates'>creates</w> a <w k='symbolic'>symbolic</w> <w k='link'>link</w> named `/tmp/syslog` pointing to `/var/log/syslog`?",
        "options": [
          {
            "val": "a",
            "text": "ln /var/log/syslog /tmp/syslog"
          },
          {
            "val": "b",
            "text": "ln -s /var/log/syslog /tmp/syslog"
          },
          {
            "val": "c",
            "text": "cp -s /tmp/syslog /var/log/syslog"
          },
          {
            "val": "d",
            "text": "link -h /var/log/syslog /tmp/syslog"
          }
        ],
        "correct": "b",
        "explainRu": "Изи балл! Запомни порядок аргументов в Linux (как в `cp` и `mv`): СНАЧАЛА куда ссылаемся (оригинал), ПОТОМ имя создаваемой ссылки: `ln -s оригинал ссылка`.",
        "requirements": [
          "Найди слово `symbolic link` в вопросе.",
          "Выбери команду с правильным флагом и порядком аргументов."
        ],
        "hint": "Symbolic = флаг `-s` -> `ln -s /var/log/syslog /tmp/syslog`!",
        "difficulty": "easy"
      },
      {
        "id": "t11_boss",
        "type": "terminal",
        "title": "БОСС 120%: Безопасный деплой продакшена и линковка системного лога",
        "matter": 40,
        "difficulty": "hard",
        "char": "batya",
        "story": "Релиз новой версии системы остановлен службой безопасности: приватные ключи открыты для чтения, скрипт развёртывания заблокирован, а инженерам нужен быстрый доступ к журналу событий через симлинк.",
        "requirements": [
          "Заблокируй несанкционированный доступ к приватному ключу `id_ed25519`, установив строгие права только для владельца (чтение и запись).",
          "Выдай права на запуск и чтение скрипту деплоя `/root/deploy.sh` с полным доступом владельцу и правами на чтение и исполнение остальным.",
          "Выполни скрипт `./deploy.sh` в текущей директории для запуска обновления продакшена.",
          "Создай символическую ссылку `/root/syslog-link`, ведущую на системный журнал `/var/log/syslog`."
        ],
        "chips": [
          "chmod 600 id_ed25519",
          "chmod 755 deploy.sh",
          "./deploy.sh",
          "ln -s /var/log/syslog /root/syslog-link",
          "ls -l"
        ],
        "checkRules": [
          "perm:id_ed25519:600",
          "perm:deploy.sh:755",
          "cmd:./deploy.sh",
          "symlink:/root/syslog-link:/var/log/syslog"
        ],
        "hint": "Выполни в терминале: 1) `chmod 600 id_ed25519`, 2) `chmod 755 deploy.sh`, 3) `./deploy.sh`, 4) `ln -s /var/log/syslog /root/syslog-link` и жми «✅ Проверка»!"
      }
    ]
  }
];
