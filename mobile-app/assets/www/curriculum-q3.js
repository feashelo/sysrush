// SysRush - Quest 3: SysAdmin, Bash, Systemd, SSH & Container Security (Levels 12-17)
// Generated for JavaRush-style Hardware + Linux + LPIC-1 learning platform

(function () {
  if (typeof window !== "undefined" && window.CURRICULUM && window.CURRICULUM.xrayDict) {
    Object.assign(window.CURRICULUM.xrayDict, {
      shebang: ["шеба́нг", "первая строка #!/bin/bash с указанием шелла", "Hash (#) + Bang (!) = Shebang"],
      supplementary: ["саплиме́нтари", "дополнительные (вторичные) группы", "Например группа sudo или docker (-aG)"],
      append: ["аппе́нд", "дописать в конец, не удаляя старые данные", "Флаг -a в usermod -aG и оператор >>"],
      substitution: ["сабститью́шн", "подстановка вывода команды $(cmd)", "Command substitution: результат выполнения вставляется в строку"],
      service: ["сё́рвис", "системная служба / демон в systemd", "Управляется через systemctl"],
      synchronization: ["синкронайзэ́йшн", "синхронизация точного времени по NTP", "Протокол NTP порт 123/UDP"],
      delta: ["де́льта", "разница / изменившиеся блоки файла", "Дельта-синхронизация в rsync (-avz)"],
      descriptor: ["дискри́птер", "файловый дескриптор открытого файла или сокета", "Лимиты дескрипторов регулируются через ulimit -n"],
      cgroups: ["си-групс", "контрольные группы ресурсов ядра Linux", "Control Groups квотируют CPU, память и IOPS контейнера"],
      namespace: ["нэ́ймспэйс", "пространство имён ядра для изоляции", "Изолирует видимость процессов (PID) и сети (NET)"]
    });
  }

  window.CURRICULUM_Q3 = [
  {
    "level": 12,
    "questId": "q_admin",
    "cost": 55,
    "title": "Пользователи, Группы (/etc/passwd, /etc/shadow, /etc/skel) и Привилегии sudo (visudo)",
    "shortDesc": "Анатомия UID 0..1000+, 7 полей /etc/passwd, закрытый сейф /etc/shadow, шаблон /etc/skel, ловушка usermod -aG и visudo.",
    "blocks": [
      {
        "type": "step_head",
        "step": 1,
        "title": "Шаг 1. Архитектура учетных записей, 7 полей /etc/passwd и создание юзера useradd",
        "roadmap": "roadmap.sh: User Management & Sudo Privileges"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "Здорово, боец! Работать постоянно под <code>root</code> — всё равно что бриться бензопилой: одно неверное движение пальца, опечатка в пробеле команды <code>rm -rf /</code>, и весь продакшен компании летит в бездну! В настоящем enterprise-окружении прямо под рутом не работает никто. Создаётся аккаунт живого человека с обычными правами, которому при необходимости выдают право надевать «костюм железного человека» через утилиту <code>sudo</code>. Давай разберём, как устроены пользователи в Linux под капотом!"
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. Иерархия числовых идентификаторов (UID / User ID):</h3>\n            <p>В Linux ядру совершенно наплевать на красивые имена вроде <code>alex</code> или <code>devops</code>. Для ядра ячейка процесса — это число. Идентификатор пользователя называется <strong>UID</strong> (User Identifier):</p>\n            <ul>\n              <li><strong><code>UID 0</code></strong> — это <strong>root</strong>, абсолютный суперпользователь, царь и бог всей операционной системы. Все проверки прав в ядре для UID 0 просто отключаются. Даже если у файла стоят права <code>000</code>, root его всё равно прочитает и удалит.</li>\n              <li><strong><code>UID 1 .. 999</code></strong> — <strong>системные служебные аккаунты</strong> (system accounts: <code>daemon</code>, <code>sshd</code>, <code>www-data</code>, <code>systemd-resolve</code>). Они нужны для изоляции демонов: если веб-сервер взломают через уязвимость, хакер получит права только ограниченного юзера <code>www-data</code>, а не root! Для них в качестве командной оболочки всегда задаётся <code>/usr/sbin/nologin</code> или <code>/bin/false</code>, чтобы под ними нельзя было зайти в интерактивную консоль.</li>\n              <li><strong><code>UID 1000+</code></strong> — <strong>обычные живые пользователи</strong> (human users: <code>alex</code>, <code>devops</code>, <code>ivan</code>). В современных дистрибутивах (Debian, Ubuntu, CentOS) отсчёт первого созданного человека всегда начинается строго с <strong>1000</strong>.</li>\n            </ul>\n\n            <h3>2. Анатомия священного файла <code>/etc/passwd</code> (Ровно 7 полей через двоеточие):</h3>\n            <p>Этот файл доступен для чтения <strong>абсолютно всем процессам в системе</strong> (права <code>644</code>). Открой его через <code>cat /etc/passwd</code>, и ты увидишь строки из 7 полей:</p>\n            <pre><code>devops:x:1001:1001:DevOps Engineer:/home/devops:/bin/bash</code></pre>\n            <ol>\n              <li><code>devops</code> — логин пользователя (username).</li>\n              <li><code>x</code> — заглушка пароля. Исторически здесь лежал хэш, но в целях безопасности его перенесли в закрытый <code>/etc/shadow</code>.</li>\n              <li><code>1001</code> — числовой <strong>UID</strong> пользователя.</li>\n              <li><code>1001</code> — числовой <strong>GID</strong> первичной группы (Primary Group ID).</li>\n              <li><code>DevOps Engineer</code> — комментарий / поле <strong>GECOS</strong> (обычно полное имя или должность).</li>\n              <li><code>/home/devops</code> — путь к домашней директории (Home directory).</li>\n              <li><code>/bin/bash</code> — интерактивная командная оболочка (Login shell).</li>\n            </ol>\n\n            <h3>3. Правильное создание пользователя: утилита <code>useradd</code>:</h3>\n            <p>В скриптах автоматизации аккаунты создаются низкоуровневой утилитой <code>useradd</code>. Чтобы не получить «кривого» юзера без папки и шелла, запомни обязательные флаги:</p>\n            <pre><code>useradd -m -s /bin/bash devops</code></pre>\n            <ul>\n              <li>Ключ <strong><code>-m</code></strong> (<code>--create-home</code>) — ОБЯЗАТЕЛЬНО создать домашнюю папку <code>/home/devops</code> и скопировать туда шаблон из <code>/etc/skel</code>. Без этого флага пользователь останется без домашнего каталога!</li>\n              <li>Ключ <strong><code>-s /bin/bash</code></strong> — явно назначить интерактивную оболочку Bash (иначе на некоторых системах по умолчанию встанет урезанный <code>/bin/sh</code>).</li>\n            </ul>\n        "
      },
      {
        "type": "cmd_anatomy",
        "cmd": "usermod -aG sudo devops",
        "desc": "Безопасное добавление существующего пользователя devops в привилегированную группу sudo",
        "output": "(команда завершается молча, результат проверяется через id devops)",
        "notes": [
          "Флаг -a (--append) критически важен: он дописывает группу в существующий список, сохраняя членство в других группах!",
          "Флаг -G (--groups) указывает список дополнительных (supplementary) групп через запятую.",
          "Команда id devops выведет uid=1001(devops) gid=1001(devops) groups=1001(devops),27(sudo)."
        ]
      },
      {
        "type": "task_ref",
        "taskId": "t12_e0"
      },
      {
        "type": "task_ref",
        "taskId": "t8_1"
      },
      {
        "type": "step_head",
        "step": 2,
        "title": "Шаг 2. Секретный сейф /etc/shadow, хэширование паролей и aging",
        "roadmap": "roadmap.sh: Password Hashes & /etc/shadow"
      },
      {
        "type": "dialog",
        "char": "kira",
        "text": "Смотри, почему разделение <code>/etc/passwd</code> и <code>/etc/shadow</code> спасло Linux от катастрофы! Пароли в открытом виде система не хранит никогда — только криптографические хэши с солью. Если бы хэши лежали в публичном /etc/passwd, злоумышленник мог бы скачать его и расшифровать пароли брутфорсом на GPU. Поэтому хэши вынесли в /etc/shadow с правами 640!"
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. Почему пароли перенесли в <code>/etc/shadow</code>?</h3>\n            <p>Пароли в чистом открытом виде в Linux не хранятся вообще никогда — только их <strong>криптографические хэши с солью (Salt)</strong>. Но если хэш лежит в общедоступном <code>/etc/passwd</code>, злоумышленник может скачать этот файл и у себя на мощной видеокарте миллионами переборов в секунду восстановить пароли сотрудников (атака по словарю / брутфорс офлайн).</p>\n            <p>Поэтому в Linux хэши перенесли в специальный сейф <strong><code>/etc/shadow</code></strong>. На этот файл установлены строжайшие права доступа <strong><code>640 (root:shadow)</code></strong> или <code>600 (root:root)</code>: обычные пользователи даже не могут прочитать его содержимое!</p>\n\n            <h3>2. Анатомия строки <code>/etc/shadow</code> (9 полей):</h3>\n            <pre><code>devops:$6$qZ7y$8fD...:19740:0:90:7:::</code></pre>\n            <ul>\n              <li><strong>Поле 1 (Логин):</strong> <code>devops</code>.</li>\n              <li><strong>Поле 2 (Хэш пароля):</strong> Начинается с идентификатора алгоритма шифрования:\n                <ul>\n                  <li><code>$1$</code> — устаревший MD5 (небезопасен!).</li>\n                  <li><code>$5$</code> — SHA-256.</li>\n                  <li><strong><code>$6$</code></strong> — современный <strong>SHA-512</strong> (длинный 86-символьный хэш, стандарт де-факто).</li>\n                  <li><code>$y$</code> — новейший устойчивый к GPU алгоритм <strong>yescrypt</strong> (в Debian 12 / Ubuntu 22.04+).</li>\n                  <li><code>!</code> или <code>*</code> — аккаунт заблокирован, вход по паролю невозможен (системные демоны).</li>\n                </ul>\n              </li>\n              <li><strong>Поле 3 (Дата смены):</strong> Количество дней с 1 января 1970 года (Unix Epoch), когда пароль был изменен в последний раз.</li>\n              <li><strong>Поля 4-8 (Password Aging):</strong> Политики устаревания пароля — минимальное количество дней между сменами, максимальный срок жизни пароля (например <code>90</code> дней до обязательной смены), количество дней предупреждения до экспирации (<code>7</code> дней).</li>\n            </ul>\n\n            <h3>3. Управление старением паролей: утилита <code>chage</code>:</h3>\n            <p>Администратор может просмотреть политики безопасности пароля командой <code>chage -l devops</code> и установить максимальный срок жизни пароля 90 дней командой <code>chage -M 90 devops</code>.</p>\n        "
      },
      {
        "type": "diagram",
        "ascii": "\n+-----------------------------------------------------------------------------------+\n|               АНАТОМИЯ СЕЙФА ХЭШЕЙ ПАРОЛЕЙ /etc/shadow                            |\n+-----------------------------------------------------------------------------------+\n| devops : $6$Salt$Hash... : 19740 : 0 : 90 : 7 :   :   :                          |\n|  [1]         [2]           [3]    [4]  [5] [6] [7] [8] [9]                        |\n|                                                                                   |\n|  [1] Логин пользователя (devops)                                                 |\n|  [2] $6$ = SHA-512 хэш с криптографической солью (Salt)                           |\n|  [3] Дата последней смены пароля (дней от 1970-01-01)                             |\n|  [4] Минимальный срок между сменами пароля (0 = хоть каждую минуту)               |\n|  [5] Максимальный срок жизни пароля (90 дней)                                     |\n|  [6] За сколько дней предупреждать о смене (7 дней)                               |\n|  [7-9] Дни неактивности, дата блокировки, резервное поле                          |\n+-----------------------------------------------------------------------------------+\n"
      },
      {
        "type": "task_ref",
        "taskId": "t8_2"
      },
      {
        "type": "step_head",
        "step": 3,
        "title": "Шаг 3. Шаблон /etc/skel, первичные/вторичные группы и безопасный visudo",
        "roadmap": "roadmap.sh: /etc/skel, Groups & visudo"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "Слушай сюда! Ты уже умеешь создавать юзеров, но знаешь ли ты, откуда в новой домашней папке берутся файлы <code>.bashrc</code> и настройки шелла? И почему админ, открывший <code>/etc/sudoers</code> в обычном nano, рискует превратить сервер в кирпич? Запомни эти системные правила как таблицу умножения!"
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. Шаблон домашней папки: каталог <code>/etc/skel</code> (Skeleton):</h3>\n            <p>Когда ты выполняешь <code>useradd -m devops</code>, операционная система не просто создаёт пустую папку в <code>/home/devops</code>. Она <strong>копирует всё содержимое каталога <code>/etc/skel</code></strong> в новый домашний каталог и автоматически меняет владельца (<code>chown</code>) на созданного пользователя.</p>\n            <p>В <code>/etc/skel</code> хранятся дефолтные скрытые файлы профиля: <code>.bashrc</code>, <code>.profile</code>, <code>.bash_logout</code>. Если системный администратор хочет, чтобы у всех новых инженеров компании в терминале сразу работали удобные цветные алиасы или корпоративное приветствие, он просто кладёт их в <code>/etc/skel/</code>!</p>\n\n            <h3>2. Первичная (Primary) vs Дополнительные (Supplementary) группы:</h3>\n            <ul>\n              <li><strong>Первичная группа (Primary group, флаг <code>-g</code>):</strong> у каждого пользователя ровно одна первичная группа. Её числовой идентификатор прописан в 4-м поле <code>/etc/passwd</code>. Когда юзер создаёт любой новый файл, этот файл по умолчанию принадлежит его первичной группе.</li>\n              <li><strong>Дополнительные / вторичные группы (Supplementary groups, флаг <code>-G</code>):</strong> пользователь может состоять в десятках дополнительных групп (<code>sudo</code>, <code>docker</code>, <code>adm</code>, <code>storage</code>). Каждая группа даёт права доступа к соответствующим системным ресурсам.</li>\n            </ul>\n\n            <h3>3. Смертельная ловушка флага <code>usermod -G</code> (Запомни навсегда!):</h3>\n            <p>Чтобы добавить инженера в группу <code>docker</code>, новички часто пишут: <code>usermod -G docker deploy</code>. <strong>ЭТО КАТАСТРОФА!</strong></p>\n            <p>Флаг <code>-G</code> БЕЗ буквы <code>-a</code> (append) <strong>стирает все старые вторичные группы</strong> пользователя и перезаписывает список заново! Если инженер состоял в группах <code>sudo</code>, <code>staff</code>, <code>developers</code>, после такой команды он мгновенно вылетит из всех них, потеряв права администратора! Всегда пиши связку с флагом <strong><code>-a</code> (append — дописать в конец)</strong>:</p>\n            <pre><code>usermod -aG docker deploy</code></pre>\n\n            <h3>4. Зачем редактировать <code>/etc/sudoers</code> строго через <code>visudo</code>:</h3>\n            <p>Файл <code>/etc/sudoers</code> определяет права выполнения команд через <code>sudo</code>. В нём прописано правило:</p>\n            <pre><code>%sudo   ALL=(ALL:ALL) ALL</code></pre>\n            <p>(Знак <code>%</code> означает группу: любой участник группы <code>sudo</code> может выполнять любые команды от любого имени).</p>\n            <p>⚠️ <strong>СВЯЩЕННОЕ ПРАВИЛО:</strong> НИКОГДА не открывай <code>/etc/sudoers</code> через обычный <code>nano</code> или <code>vim</code>! Если ты допустишь случайную опечатку или пропустишь двоеточие — синтаксис сломается, и <code>sudo</code> перестанет работать ДЛЯ ВСЕХ на сервере! Ты потеряешь root-доступ. Всегда редактируй файл строго утилитой <strong><code>visudo</code></strong>: она блокирует файл от параллельных правок и, самое главное, <strong>перед сохранением проверяет синтаксис</strong>. Если есть ошибка — <code>visudo</code> укажет на строку и не позволит испортить файл!</p>\n        "
      },
      {
        "type": "task_ref",
        "taskId": "t8_4"
      },
      {
        "type": "step_head",
        "step": 4,
        "title": "Шаг 4. Удаление учеток (userdel -r), аудит групп и экзамен LPIC-1 [107.1]",
        "roadmap": "roadmap.sh: LPIC-1 User Accounts & Group Audit"
      },
      {
        "type": "dialog",
        "char": "smith",
        "text": "Приветствую, кандидат на сертификат LPIC-1! Тема 107.1 «Manage user and group accounts and related system files» проверяет тонкие нюансы: флаги увольнения сотрудников и последствия работы с группами без ключа append."
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. Увольнение сотрудника: почему <code>userdel</code> без флага — это дыра в безопасности:</h3>\n            <p>Когда инженер покидает проект, администратор должен удалить его учётку. Если написать просто <code>userdel devops</code>, запись исчезнет из <code>/etc/passwd</code> и <code>/etc/shadow</code>. <strong>НО его домашняя папка <code>/home/devops</code> и почтовый ящик останутся на диске!</strong></p>\n            <p>В файловой системе появятся так называемые «осиротевшие файлы» (orphaned files) с числовым UID владельца, которого больше нет в системе. Если позже создать нового юзера, он получит освободившийся UID 1001 и автоматически станет хозяином всех старых секретных файлов уволенного сотрудника!</p>\n            <p>Поэтому на экзамене LPIC-1 и в реальном проде всегда используют флаг <strong><code>-r</code> (remove)</strong>:</p>\n            <pre><code>userdel -r devops</code></pre>\n            <p>(Флаг <code>-r</code> удаляет домашнюю директорию и почтовый ящик <code>/var/mail/devops</code>).</p>\n\n            <h3>2. Аудит принадлежности к группам: команды <code>id</code> и <code>groups</code>:</h3>\n            <p>Утилита <code>id devops</code> выводит числовые и символьные UID, GID и полный перечень всех supplementary групп. Утилита <code>groups devops</code> выводит только имена групп через пробел.</p>\n            <p>На экзамене 102-500 тебя обязательно спросят: что произойдет, если выполнить <code>usermod -G docker deploy</code> без флага <code>-a</code>? Ответ: пользователь войдёт в группу <code>docker</code>, но будет удалён из <code>sudo</code>, <code>staff</code> и всех остальных групп!</p>\n        "
      },
      {
        "type": "vocab"
      },
      {
        "type": "task_ref",
        "taskId": "t8_3"
      },
      {
        "type": "task_ref",
        "taskId": "t8_5"
      },
      {
        "type": "dialog",
        "char": "kira",
        "text": "Тревога службы безопасности! Инспектор требует срочно подготовить изолированный профиль аудитора: создай пользователя командой useradd -m -s /bin/bash secops, добавь его в административную группу usermod -aG sudo secops, проинспектируй его идентификаторы через id secops и запусти проверку конфигурации через visudo. Ни секунды промедления!"
      },
      {
        "type": "task_ref",
        "taskId": "t12_boss"
      }
    ],
    "vocab": [
      {
        "en": "user account",
        "pron": "[ю́зер акка́унт]",
        "ru": "учётная запись пользователя (UID 1000+ для обычных юзеров, UID 0 — root)",
        "assoc": "Создаётся командой useradd -m -s /bin/bash"
      },
      {
        "en": "encrypted passwords",
        "pron": "[энкри́птед па́ссуордз]",
        "ru": "захэшированные пароли в защищённом файле /etc/shadow",
        "assoc": "В /etc/passwd стоит заглушка x, а реальные хэши лежат в /etc/shadow"
      },
      {
        "en": "supplementary groups",
        "pron": "[саплиме́нтари групс]",
        "ru": "дополнительные (вторичные) группы привилегий (sudo, docker)",
        "assoc": "Добавляются строго с флагом -a: usermod -aG sudo user"
      },
      {
        "en": "home directory",
        "pron": "[хо́ум дире́ктори]",
        "ru": "домашний каталог пользователя (/home/имя)",
        "assoc": "При useradd создаётся флагом -m из шаблона /etc/skel"
      },
      {
        "en": "login shell",
        "pron": "[ло́гин шелл]",
        "ru": "командная оболочка входа (7-е поле в /etc/passwd)",
        "assoc": "/bin/bash для людей, /usr/sbin/nologin для системных демонов"
      },
      {
        "en": "visudo",
        "pron": "[ви-су́до]",
        "ru": "безопасный редактор /etc/sudoers с проверкой синтаксиса",
        "assoc": "Не сохранит сломанный sudoers и спасёт от потери прав root"
      }
    ],
    "tasks": [
      {
        "id": "t12_e0",
        "type": "lpic_fill",
        "difficulty": "easy",
        "title": "Разминка: Главный файл учетных записей Linux",
        "matter": 10,
        "char": "smith",
        "story": "Быстрая разминка по базовой архитектуре учетных записей в Linux перед боевой практикой.",
        "enQuestion": "<w k='which'>Which</w> <w k='file'>file</w> <w k='stores'>stores</w> <w k='user'>user</w> account <w k='information'>information</w>, UID, GID, and home directory <w k='path'>path</w>? (<w k='specify'>Specify</w> the <w k='full'>full</w> <w k='path'>path</w>.)",
        "acceptedAnswers": [
          "/etc/passwd",
          "passwd"
        ],
        "placeholder": "/etc/...",
        "explainRu": "В яблочко! Файл `/etc/passwd` содержит список всех учетных записей, их UID, GID и пути к домашним каталогам.",
        "requirements": [
          "Вспомни главный системный файл учетных записей.",
          "Впиши полный абсолютный путь к файлу."
        ],
        "hint": "Главный файл пользователей в каталоге /etc: `/etc/passwd`!"
      },
      {
        "id": "t8_1",
        "type": "terminal",
        "title": "Онбординг инженера: создай аккаунт devops и выдай ему группу sudo",
        "matter": 30,
        "char": "diego",
        "story": "К нам вышел новый инженер `devops`. Создай ему аккаунт с домашней папкой и оболочкой `/bin/bash`, добавь в группу `sudo` (не потеряв `-a`!) и проверь его группы командой `id devops`!",
        "requirements": [
          "Создай пользователя `devops` с домашней папкой (`useradd -m -s /bin/bash devops`).",
          "Добавь `devops` в группу `sudo` (`usermod -aG sudo devops`).",
          "Проверь UID и список групп командой `id devops`."
        ],
        "chips": [
          "cat /etc/passwd",
          "useradd -m -s /bin/bash devops",
          "usermod -aG sudo devops",
          "id devops"
        ],
        "hint": "Выполни в терминале по очереди `useradd -m -s /bin/bash devops`, затем `usermod -aG sudo devops` и проверь `id devops`!",
        "checkRules": [
          "user_exists:devops",
          "user_in_sudo:devops",
          "cmd:id devops"
        ],
        "difficulty": "medium"
      },
      {
        "id": "t8_2",
        "type": "lpic_fill",
        "title": "Ввод ответа LPIC-1 [107.1]: Где спрятаны хэши паролей?",
        "matter": 25,
        "char": "smith",
        "story": "Классический вопрос с вводом пути на LPIC-1 (экзамен 102-500). Не попадись на обманку с названием `/etc/passwd`!",
        "enQuestion": "<w k='which'>Which</w> <w k='file'>file</w> <w k='stores'>stores</w> <w k='encrypted'>encrypted</w> <w k='user'>user</w> <w k='passwords'>passwords</w> and password aging <w k='information'>information</w> on a modern Linux <w k='system'>system</w>? (<w k='specify'>Specify</w> the <w k='full'>full</w> <w k='path'>path</w>.)",
        "acceptedAnswers": [
          "/etc/shadow"
        ],
        "placeholder": "Полный путь от / ...",
        "explainRu": "Точно в цель! Исторически в 70-х пароли лежали в `/etc/passwd`, но ради безопасности их давно унесли в закрытый `/etc/shadow`!",
        "requirements": [
          "Переведи `encrypted user passwords`.",
          "Впиши полный путь к защищённому файлу паролей."
        ],
        "hint": "«Теневой» файл в `/etc` -> `/etc/shadow`!",
        "difficulty": "easy"
      },
      {
        "id": "t8_3",
        "type": "lpic_en",
        "title": "Тренажёр LPIC-1 [107.1]: Добавление в доп. группу без потери старых",
        "matter": 20,
        "char": "smith",
        "story": "Проверяем ту самую ловушку с флагом `-aG`!",
        "enQuestion": "<w k='which'>Which</w> <w k='command'>command</w> <w k='adds'>adds</w> an <w k='existing'>existing</w> <w k='user'>user</w> `alex` to the <w k='supplementary'>supplementary</w> <w k='group'>group</w> `docker` <w k='without'>without</w> removing `alex` from other <w k='groups'>groups</w>?",
        "options": [
          {
            "val": "a",
            "text": "usermod -G docker alex"
          },
          {
            "val": "b",
            "text": "usermod -aG docker alex"
          },
          {
            "val": "c",
            "text": "useradd -G docker alex"
          },
          {
            "val": "d",
            "text": "groupmod -a alex docker"
          }
        ],
        "correct": "b",
        "explainRu": "Молодчина! Вариант А (`-G` без `-a`) перезаписал бы все дополнительные группы на одну `docker`, а `-aG` аккуратно дописывает новую!",
        "requirements": [
          "Обрати внимание на `existing user` (значит `usermod`, а не `useradd`) и `without removing`.",
          "Выбери команду с флагом добавления `-aG`."
        ],
        "hint": "`usermod -aG docker alex`!",
        "difficulty": "easy"
      },
      {
        "id": "t8_4",
        "type": "builder",
        "title": "Инженер Доступа: Архитектура UID, шаблон /etc/skel, группы и visudo",
        "matter": 20,
        "char": "batya",
        "story": "Разбираем системную анатомию пользователей и привилегий sudo! Определи диапазоны UID, роль каталога /etc/skel, последствия флага -G без -a и причину использования visudo.",
        "requirements": [
          "Определи назначение числовых диапазонов UID в Linux.",
          "Выбери роль каталога-шаблона /etc/skel при создании пользователя.",
          "Укажи последствие вызова usermod -G без добавления флага -a.",
          "Определи, почему /etc/sudoers редактируют строго через visudo."
        ],
        "fields": [
          {
            "id": "uids",
            "label": "1. Иерархия числовых идентификаторов UID в ядре Linux:",
            "options": [
              {
                "val": "uids",
                "text": "UID 0 = root; 1–999 = системные демоны с /usr/sbin/nologin; 1000+ = живые пользователи"
              },
              {
                "val": "wrong1",
                "text": "UID 0–1000 = живые пользователи; 1001+ = системные демоны"
              },
              {
                "val": "wrong2",
                "text": "Все пользователи имеют одинаковый UID, различия только в пароле"
              }
            ],
            "correct": "uids"
          },
          {
            "id": "skel",
            "label": "2. Назначение каталога-шаблона /etc/skel при вызове useradd -m:",
            "options": [
              {
                "val": "skel",
                "text": "Шаблон профиля: всё содержимое /etc/skel (включая .bashrc) копируется в новую папку /home/username с правами пользователя"
              },
              {
                "val": "wrong1",
                "text": "Каталог для временных файлов сессии текущего суперпользователя"
              },
              {
                "val": "wrong2",
                "text": "Архивная копия старых удалённых аккаунтов для восстановления"
              }
            ],
            "correct": "skel"
          },
          {
            "id": "usermod_trap",
            "label": "3. Ловушка команды usermod -G <group> <user> БЕЗ флага -a:",
            "options": [
              {
                "val": "trap",
                "text": "Перезаписывает список вторичных групп, удаляя пользователя из всех прежних групп (sudo, docker и др.)!"
              },
              {
                "val": "wrong1",
                "text": "Мгновенно блокирует пароль пользователя в /etc/shadow"
              },
              {
                "val": "wrong2",
                "text": "Ничего не меняет, флаги -G и -aG в Linux полностью эквивалентны"
              }
            ],
            "correct": "trap"
          },
          {
            "id": "visudo",
            "label": "4. Почему конфигурационный файл /etc/sudoers редактируют строго через visudo:",
            "options": [
              {
                "val": "visudo",
                "text": "visudo блокирует файл от параллельных правок и проверяет синтаксис перед сохранением, предотвращая потерю sudo"
              },
              {
                "val": "wrong1",
                "text": "Обычные редакторы nano и vim не могут открыть файлы размером более 1 Кб"
              },
              {
                "val": "wrong2",
                "text": "visudo автоматически шифрует файл алгоритмом RSA-4096"
              }
            ],
            "correct": "visudo"
          }
        ],
        "hint": "UID 0 — root, /etc/skel — шаблон профиля, -G без -a удаляет старые группы, visudo проверяет синтаксис!",
        "difficulty": "medium"
      },
      {
        "id": "t8_5",
        "type": "lpic_en",
        "title": "Тренажёр LPIC-1 [107.1]: Опасность вызова usermod -G без флага -a",
        "matter": 15,
        "char": "smith",
        "story": "Классический вопрос экзамена LPIC-1 (102-500) на понимание модификации вторичных групп!",
        "enQuestion": "An administrator executes the command `usermod -G docker deploy` on an existing user `deploy`, who was previously a member of groups `sudo` and `staff`. What is the result of this command?",
        "options": [
          {
            "val": "a",
            "text": "The user is added to group docker and retains membership in sudo and staff"
          },
          {
            "val": "b",
            "text": "The user is added to group docker, but is removed from groups sudo and staff because -a was omitted"
          },
          {
            "val": "c",
            "text": "The command fails with an error because primary group must be modified first"
          },
          {
            "val": "d",
            "text": "The primary group of user deploy becomes docker"
          }
        ],
        "correct": "b",
        "explainRu": "Именно так! Флаг `-G` без `-a` (append) заменяет весь список дополнительных групп на указанный. Пользователь войдёт в `docker`, но вылетит из `sudo` и `staff`!",
        "requirements": [
          "Обрати внимание на отсутствие флага `-a` в `usermod -G docker deploy`.",
          "Вспомни, что `-G` перезаписывает список supplementary groups целиком."
        ],
        "hint": "Без `-a` старые вторичные группы стираются -> вариант `b` (removed from sudo and staff)!",
        "difficulty": "easy"
      },
      {
        "id": "t12_boss",
        "type": "terminal",
        "difficulty": "hard",
        "title": "120% Босс: Экстренный аудит доступа и создание офицера secops",
        "matter": 40,
        "char": "kira",
        "story": "Внеплановый аудит безопасности: необходимо создать выделенного инженера безопасности secops с полными правами sudo и валидировать системный доступ.",
        "requirements": [
          "Создать локального пользователя secops с домашним каталогом и шеллом bash",
          "Предоставить пользователю secops права суперпользователя через включение в группу sudo",
          "Проверить принадлежность созданного пользователя к группам утилитой инспекции ID",
          "Выполнить валидацию синтаксиса файла конфигурации привилегий sudoers"
        ],
        "checkRules": [
          "user_exists:secops",
          "user_in_sudo:secops",
          "cmd:id secops",
          "cmd:visudo"
        ],
        "chips": [
          "useradd -m -s /bin/bash secops",
          "usermod -aG sudo secops",
          "id secops",
          "visudo"
        ],
        "hint": "Выполни в терминале `useradd -m -s /bin/bash secops`, затем `usermod -aG sudo secops`, проверь `id secops` и запусти `visudo`!"
      }
    ]
  },
  {
    "level": 13,
    "questId": "q_admin",
    "cost": 55,
    "title": "Переменные Окружения (env, export, ~/.bashrc) и Планировщик Задач cron / at",
    "shortDesc": "5 полей crontab, системный /etc/crontab, export переменных, ~/.bashrc vs /etc/profile, код возврата $? и таймеры systemd.",
    "blocks": [
      {
        "type": "step_head",
        "step": 1,
        "title": "Шаг 1. Планировщик задач cron: 5 полей времени и системный /etc/crontab",
        "roadmap": "roadmap.sh: Crontab & Scheduling"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "Слушай сюда! Если админ каждый вечер ставит будильник на 3 часа ночи, чтобы проснуться и вручную скопировать бэкап базы данных — это не админ, а ходячее недоразумение! В Linux для регулярных задач есть неутомимый робот — планировщик <code>cron</code>. Он запускается при старте ОС и каждую минуту проверяет расписания."
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. Демон cron: Неутомимый ночной дежурный:</h3>\n            <p>В Linux за выполнение задач по расписанию отвечает системный демон <strong><code>cron</code></strong> (в RHEL/CentOS называется <code>crond</code>). Раз в минуту он просыпается, считывает таблицы расписаний (таблицы <code>crontab</code>) и запускает те команды, время которых наступило.</p>\n\n            <h3>2. Пять священных полей времени (Запомни порядок!):</h3>\n            <p>Каждая строка в пользовательской таблице crontab состоит из <strong>5 полей времени</strong>, за которыми следует исполняемая команда:</p>\n            <pre><code>*    *    *    *    *    /path/to/command\n┬    ┬    ┬    ┬    ┬\n│    │    │    │    │\n│    │    │    │    └──── День недели (0 - 7, где 0 и 7 — воскресенье, 1 — понедельник)\n│    │    │    └───────── Месяц года (1 - 12)\n│    │    └────────────── День месяца (1 - 31)\n│    └─────────────────── Час (0 - 23)\n└──────────────────────── Минута (0 - 59)</code></pre>\n            <p>Звёздочка <strong><code>*</code></strong> означает «любое значение / каждую минуту / каждый день».</p>\n\n            <h3>3. Пользовательские таблицы: утилита <code>crontab</code>:</h3>\n            <ul>\n              <li><code>crontab -e</code> (edit) — открыть личную таблицу расписания текущего пользователя во встроенном редакторе.</li>\n              <li><code>crontab -l</code> (list) — вывести текущие задания на экран консоли.</li>\n              <li><code>crontab -r</code> (remove) — удалить всю личную таблицу расписания целиком (осторожно, не перепутай с -e!).</li>\n            </ul>\n\n            <h3>4. Системный <code>/etc/crontab</code> (Внимание: 6 полей!):</h3>\n            <p>Помимо личных пользовательских таблиц, в каталоге <code>/etc/</code> лежит общесистемный файл <strong><code>/etc/crontab</code></strong>. В нём между полями времени и командой добавлено <strong>обязательное 6-е поле — имя пользователя</strong>, от которого запускается скрипт:</p>\n            <pre><code>0  3  *  *  *  root  /root/backup.sh</code></pre>\n            <p>(Запуск скрипта ежедневно ровно в 03:00 ночи от имени пользователя <code>root</code>).</p>\n        "
      },
      {
        "type": "cmd_anatomy",
        "cmd": "0 3 * * * root /root/backup.sh",
        "desc": "Запуск скрипта резервного копирования ежедневно ровно в 03:00 ночи от имени пользователя root",
        "output": "(задача прописывается в /etc/crontab через перенаправление >>)",
        "notes": [
          "1-е поле (0) = 0-я минута часа.",
          "2-е поле (3) = 3 часа ночи (03:00).",
          "Поля 3, 4, 5 (*) = каждый день месяца, каждый месяц, любой день недели.",
          "root = пользователь, от имени которого cron запустит бинарник."
        ]
      },
      {
        "type": "task_ref",
        "taskId": "t13_e0"
      },
      {
        "type": "task_ref",
        "taskId": "t9_1"
      },
      {
        "type": "step_head",
        "step": 2,
        "title": "Шаг 2. Расшифровка выражений crontab на LPIC-1 и альтернатива systemd timers",
        "roadmap": "roadmap.sh: Crontab Decoding & Systemd Timers"
      },
      {
        "type": "dialog",
        "char": "kira",
        "text": "Привет! На экзамене LPIC-1 задачи на чтение crontab дают почти гарантированные баллы, но составители обожают запутывать студентов звёздочками, шагами через слэш и таймерами systemd! Давай разложим синтаксис по полочкам."
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. Спецсимволы в crontab:</h3>\n            <ul>\n              <li><strong>Запятая (<code>,</code>) — перечисление:</strong> <code>0 9,18 * * *</code> (запуск в 09:00 и в 18:00 каждый день).</li>\n              <li><strong>Дефис (<code>-</code>) — диапазон:</strong> <code>0 9-18 * * 1-5</code> (каждый час с 9 до 18 с понедельника по пятницу в рабочие дни).</li>\n              <li><strong>Слэш (<code>/</code>) — шаг:</strong> <code>*/15 * * * *</code> (каждые 15 минут: 0, 15, 30, 45).</li>\n              <li><code>30 2 * * *</code> — запуск ровно в 02:30 ночи каждый день. Не перепутай часы и минуты! Первыми всегда идут минуты!</li>\n            </ul>\n\n            <h3>2. Современная альтернатива: <code>systemd .timer</code> юниты:</h3>\n            <p>В современных дистрибутивах классический cron всё чаще заменяют таймерами systemd (файлы с расширением <code>.timer</code>, работающие в связке с одноименным <code>.service</code>). Они настраиваются через директиву календаря <code>OnCalendar=*-*-* 03:00:00</code>.</p>\n            <p><strong>Ключевое супер-преимущество таймеров над cron:</strong> директива <strong><code>Persistent=true</code></strong>!</p>\n            <p>Если сервер был выключен во время запланированного расписания (например, ночью отключали электричество), классический <code>cron</code> просто <strong>проспит задачу и не выполнит её вовсе</strong>! А таймер systemd с опцией <code>Persistent=true</code> сохранит отметку на диске и выполнит пропущенную задачу немедленно при первой же загрузке сервера!</p>\n        "
      },
      {
        "type": "diagram",
        "ascii": "\n+-----------------------------------------------------------------------------------+\n|               5 ПОЛЕЙ РАСПИСАНИЯ ПЛАНИРОВЩИКА CRONTAB                             |\n+-----------------------------------------------------------------------------------+\n|   30     02      *      *      *       /usr/local/bin/clean.sh                    |\n|  [мин]  [час]  [день]  [мес]  [день_нед]   [команда для запуска]                  |\n|                                                                                   |\n|  0..59  0..23   1..31  1..12    0..7                                              |\n|                                                                                   |\n|  Примеры:                                                                         |\n|  */10 * * * *   -> Каждые 10 минут                                                |\n|  0 3 * * 1-5    -> В 03:00 ночи по будням (пн-пт)                                 |\n|  Persistent=true -> В systemd .timer запускает пропущенные задачи после включения  |\n+-----------------------------------------------------------------------------------+\n"
      },
      {
        "type": "task_ref",
        "taskId": "t9_2"
      },
      {
        "type": "step_head",
        "step": 3,
        "title": "Шаг 3. Переменные окружения (env, export, PATH) и конфигурационные профили",
        "roadmap": "roadmap.sh: Environment Variables & Shell Profiles"
      },
      {
        "type": "dialog",
        "char": "diego",
        "text": "Слушай, когда скрипт или микросервис запускаются на сервере, откуда они знают, где искать базы данных, настройки безопасности и в каком режиме работать — test или production? Через переменные окружения! Давай разберём команду <code>export</code> и утилиту <code>env</code>."
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. Локальные переменные shell vs Переменные окружения (Environment Variables):</h3>\n            <p>Когда ты объявляешь переменную вида <code>APP_ENV=production</code>, это <strong>локальная переменная текущей оболочки</strong>. Она существует только в памяти текущего процесса Bash. Если из этой оболочки запустить дочерний процесс (bash-скрипт, Node.js или Python), он <strong>НЕ увидит эту переменную</strong>!</p>\n            <p>Чтобы переменная передавалась всем дочерним процессам и службам, её необходимо <strong>экспортировать в глобальное окружение процесса</strong> с помощью ключевого слова <strong><code>export</code></strong>:</p>\n            <pre><code>export APP_ENV=production</code></pre>\n\n            <h3>2. Просмотр экспортированных переменных: утилита <code>env</code>:</h3>\n            <p>Команда <strong><code>env</code></strong> (или <code>printenv</code>) без аргументов выводит полный список всех экспортированных переменных окружения текущего сеанса. Ты увидишь переменные <code>USER</code>, <code>HOME</code>, <code>SHELL</code> и добавленную <code>APP_ENV=production</code>.</p>\n            <p>Важнейшая переменная в окружении — <strong><code>$PATH</code></strong>: список каталогов через двоеточие (<code>/usr/local/bin:/usr/bin:/bin</code>), в которых командная строка ищет бинарные файлы при вводе имени любой команды.</p>\n\n            <h3>3. Конфигурационные файлы профилей: где сохранять переменные навсегда:</h3>\n            <ul>\n              <li><strong><code>~/.bashrc</code></strong> — локальный файл в домашнем каталоге пользователя. Читается при открытии каждого интерактивного терминала (non-login shell). Здесь прописывают личные переменные и алиасы юзера.</li>\n              <li><strong><code>/etc/profile</code></strong> (и каталог <code>/etc/profile.d/*.sh</code>) — <strong>общесистемный профиль</strong>. Выполняется для всех пользователей при входе в систему (login shell). Здесь прописывают глобальные переменные для всего сервера.</li>\n            </ul>\n        "
      },
      {
        "type": "task_ref",
        "taskId": "t9_4"
      },
      {
        "type": "step_head",
        "step": 4,
        "title": "Шаг 4. Код возврата $?, логические цепочки && / || и архитектура автоматизации",
        "roadmap": "roadmap.sh: Exit Codes, Logic Operators & Architecture"
      },
      {
        "type": "dialog",
        "char": "smith",
        "text": "Внимание! Темы 105.1 и 105.2 LPIC-1 требуют идеального владения кодами возврата команд и операторами условного выполнения цепочек в автоматизации."
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. Священный код возврата <code>$?</code> (Exit status):</h3>\n            <p>В операционной системе Linux абсолютно любая завершившаяся программа сообщает ядру статус своего выхода — число от <code>0</code> до <code>255</code>. Этот код сохраняется в специальной переменной Bash <strong><code>$?</code></strong>:</p>\n            <ul>\n              <li><strong><code>$? = 0</code></strong> — абсолютный <strong>УСПЕХ (zero errors)</strong>! Команда выполнена без малейших замечаний.</li>\n              <li><strong><code>$? = 1 .. 255</code></strong> — <strong>ОШИБКА</strong> (1 = общая ошибка, 2 = неверный синтаксис флагов, 127 = команда не найдена).</li>\n            </ul>\n            <p>Проверить код последней команды можно сразу после её выполнения: <code>echo $?</code>.</p>\n\n            <h3>2. Логические цепочки выполнения: операторы <code>&&</code> и <code>||</code>:</h3>\n            <ul>\n              <li><strong>Оператор <code>&&</code> (логическое «И»):</strong> вторая команда выполнится <strong>ТОЛЬКО если первая завершилась успешно (код 0)</strong>:\n                <pre><code>mkdir /tmp/release && cp app /tmp/release</code></pre>\n                <p>Если создание папки упадёт с ошибкой (например, нет прав), копирование даже не начнётся!</p>\n              </li>\n              <li><strong>Оператор <code>||</code> (логическое «ИЛИ»):</strong> вторая команда выполнится <strong>ТОЛЬКО если первая завершилась с ошибкой (код != 0)</strong>:\n                <pre><code>ping -c 1 8.8.8.8 || echo \"Авария: интернет-шлюз недоступен!\"</code></pre>\n              </li>\n            </ul>\n\n            <h3>3. Сравнение классического cron и таймеров systemd с <code>Persistent=true</code>:</h3>\n            <p>В enterprise-инфраструктуре critical-задачи (бэкапы баз данных, ротация логов) переводят на <code>.timer</code> с флагом <code>Persistent=true</code>, гарантируя выполнение даже после аварийных отключений электропитания.</p>\n        "
      },
      {
        "type": "vocab"
      },
      {
        "type": "task_ref",
        "taskId": "t9_3"
      },
      {
        "type": "task_ref",
        "taskId": "t9_5"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "Боец, у нас ночной релиз и срочная подготовка продакшена! Задай переменную среды export APP_ENV=production, упакуй критический каталог конфигураций командой архивации tar -czvf /root/etc-backup.tar.gz /etc, пропиши ночной запуск скрипта в /etc/crontab через команду echo \"0 3 * * * root /root/backup.sh\" >> /etc/crontab и убедись в успешном коде завершения через echo $?. Действуй без промедления!"
      },
      {
        "type": "task_ref",
        "taskId": "t13_boss"
      }
    ],
    "vocab": [
      {
        "en": "environment variable",
        "pron": "[инва́йронмент вэ́риэбл]",
        "ru": "переменная окружения, наследуемая дочерними процессами",
        "assoc": "Экспортируется через export APP_ENV=prod, проверяется через env"
      },
      {
        "en": "exit status ($?)",
        "pron": "[э́кзит стэ́йтус]",
        "ru": "код возврата предыдущей команды (0 = успех, 1..255 = ошибка)",
        "assoc": "Проверяется командой echo $? сразу после завершения программы"
      },
      {
        "en": "recurring job (cron)",
        "pron": "[рика́рринг джоб]",
        "ru": "регулярная повторяющаяся задача по расписанию crontab",
        "assoc": "5 звёздочек: минута, час, день месяца, месяц, день недели"
      },
      {
        "en": "schedule",
        "pron": "[ске́дьюл]",
        "ru": "расписание автоматического запуска скриптов",
        "assoc": "crontab -e открывает персональное расписание пользователя"
      },
      {
        "en": "one-time task (at)",
        "pron": "[уа́н-тайм таск]",
        "ru": "однократная отложенная задача через утилиту at",
        "assoc": "at 02:00 выполнит команду один раз и удалит из очереди atq"
      },
      {
        "en": "persistent timer",
        "pron": "[перси́стент та́ймер]",
        "ru": "таймер systemd с догоняющим запуском после простоя сервера",
        "assoc": "Persistent=true в .timer запустит пропущенный ночной бэкап"
      }
    ],
    "tasks": [
      {
        "id": "t13_e0",
        "type": "lpic_fill",
        "difficulty": "easy",
        "title": "Разминка: Системный файл расписания cron",
        "matter": 10,
        "char": "smith",
        "story": "Экспресс-тест LPIC-1 на знание расположения глобальной системной таблицы планировщика cron.",
        "enQuestion": "<w k='which'>Which</w> system <w k='file'>file</w> <w k='stores'>stores</w> cron schedule tables with specified usernames? (<w k='specify'>Specify</w> the <w k='full'>full</w> <w k='path'>path</w>.)",
        "acceptedAnswers": [
          "/etc/crontab",
          "crontab"
        ],
        "placeholder": "/etc/...",
        "explainRu": "Идеально! В отличие от пользовательских crontab-файлов, системный `/etc/crontab` содержит поле имени пользователя.",
        "requirements": [
          "Вспомни путь к общесистемной таблице задач cron.",
          "Укажи полный путь от корня."
        ],
        "hint": "Системная таблица планировщика находится в каталоге `/etc`: `/etc/crontab`!"
      },
      {
        "id": "t9_1",
        "type": "terminal",
        "title": "Ночной автобэкап: пропиши задачу на 03:00 ночи в расписание cron",
        "matter": 30,
        "char": "diego",
        "story": "Скрипт `/root/backup.sh` готов, но никто не хочет вставать в 3 часа ночи нажимать Enter! Добавь строку расписания `0 3 * * * /root/backup.sh` в `/etc/crontab` и проверь код возврата последней команды через `echo $?`!",
        "requirements": [
          "Допиши задание `0 3 * * * root /root/backup.sh` в конец файла `/etc/crontab` через `>>`.",
          "Проверь содержимое `/etc/crontab` командой `cat /etc/crontab`.",
          "Выведи код завершения предыдущей команды (`echo $?`)."
        ],
        "chips": [
          "cat /etc/crontab",
          "echo \"0 3 * * * root /root/backup.sh\" >> /etc/crontab",
          "echo $?"
        ],
        "hint": "Выполни в терминале `echo \"0 3 * * * root /root/backup.sh\" >> /etc/crontab`, затем проверь `cat /etc/crontab` и статус `echo $?`!",
        "checkRules": [
          "file_has:/etc/crontab:0 3 * * *",
          "cmd:cat /etc/crontab",
          "cmd:echo $?"
        ],
        "difficulty": "medium"
      },
      {
        "id": "t9_2",
        "type": "lpic_en",
        "title": "Тренажёр LPIC-1 [107.2]: Расшифровка расписания crontab",
        "matter": 20,
        "char": "smith",
        "story": "Такие задачи на `cron` есть буквально в каждом билете экзамена 102-500! Помни: 1-е число — минуты, 2-е — часы!",
        "enQuestion": "<w k='which'>Which</w> `crontab` entry <w k='runs'>runs</w> `/usr/local/bin/clean.sh` <w k='daily'>daily</w> at 02:30 AM (<w k='every'>every</w> <w k='day'>day</w>)?",
        "options": [
          {
            "val": "a",
            "text": "2 30 * * * /usr/local/bin/clean.sh"
          },
          {
            "val": "b",
            "text": "30 2 * * * /usr/local/bin/clean.sh"
          },
          {
            "val": "c",
            "text": "* * 2 30 * /usr/local/bin/clean.sh"
          },
          {
            "val": "d",
            "text": "02:30 * * * /usr/local/bin/clean.sh"
          }
        ],
        "correct": "b",
        "explainRu": "Супер! Новички часто путают часы и минуты местами (вариант А запустился бы в 30 часов 2 минуты — невалидно!). Сначала минуты (`30`), потом часы (`2`) -> `30 2 * * *`.",
        "requirements": [
          "Вспомни порядок полей crontab: `Минута Час ДеньМесяца Месяц ДеньНедели`.",
          "Выбери запись для ежедневного запуска в `02:30`."
        ],
        "hint": "30 минут, 2 часа -> `30 2 * * *`!",
        "difficulty": "easy"
      },
      {
        "id": "t9_3",
        "type": "lpic_en",
        "title": "Тренажёр LPIC-1 [105.2]: Переменная кода возврата в Bash",
        "matter": 20,
        "char": "smith",
        "story": "Как внутри Bash-скрипта узнать, упала предыдущая команда или отработала чисто?",
        "enQuestion": "In Bash, <w k='which'>which</w> special <w k='variable'>variable</w> holds the <w k='exit'>exit</w> <w k='status'>status</w> code of the most recently executed <w k='previous'>previous</w> <w k='command'>command</w>?",
        "options": [
          {
            "val": "a",
            "text": "$0"
          },
          {
            "val": "b",
            "text": "$#"
          },
          {
            "val": "c",
            "text": "$?"
          },
          {
            "val": "d",
            "text": "$$"
          }
        ],
        "correct": "c",
        "explainRu": "Идеально! Легко запомнить визуально: ты как бы спрашиваешь систему со знаком вопроса — «Ну чё там, получилось?» -> `$?` (`0` = да!).",
        "requirements": [
          "Найди в вопросе слова `exit status`.",
          "Выбери спецпеременную со знаком вопроса."
        ],
        "hint": "Вопрос «Успешно ли завершилось?» -> `$?`!",
        "difficulty": "easy"
      },
      {
        "id": "t9_4",
        "type": "terminal",
        "title": "Экспорт переменных окружения: настрой переменную APP_ENV и вызови env",
        "matter": 15,
        "char": "diego",
        "story": "Для запуска микросервиса необходимо перевести его в боевой режим. Экспортируй переменную окружения `export APP_ENV=production` и проверь список переменных командой `env`!",
        "requirements": [
          "Экспортируй переменную `APP_ENV` со значением `production`.",
          "Выведи список переменных окружения командой `env`."
        ],
        "chips": [
          "export APP_ENV=production",
          "env",
          "echo $PATH",
          "clear"
        ],
        "checkRules": [
          "cmd:export APP_ENV=production",
          "cmd:env"
        ],
        "hint": "Выполни команду `export APP_ENV=production`, а затем `env`!",
        "difficulty": "easy"
      },
      {
        "id": "t9_5",
        "type": "builder",
        "title": "Архитектор Окружения: Профили bashrc, код $?, цепочки && и таймеры",
        "matter": 20,
        "char": "kira",
        "story": "Закрепляем фундаментальные механизмы окружения и планирования! Разбери разницу bashrc и /etc/profile, код возврата $?, поведение && vs || и таймеры systemd.",
        "requirements": [
          "Определи область действия ~/.bashrc vs /etc/profile.",
          "Укажи числовое значение успешного кода возврата $? в Linux.",
          "Различи поведение логических операторов && и ||.",
          "Выдели преимущество systemd-таймеров с параметром Persistent=true."
        ],
        "fields": [
          {
            "id": "profiles",
            "label": "1. Различие между профилями ~/.bashrc и /etc/profile в Linux:",
            "options": [
              {
                "val": "profiles",
                "text": "~/.bashrc настраивает среду конкретного пользователя для интерактивных сессий; /etc/profile задаёт глобальные переменные для всей системы при логине"
              },
              {
                "val": "wrong1",
                "text": "/etc/profile работает только для пользователя root, а ~/.bashrc для всех остальных"
              },
              {
                "val": "wrong2",
                "text": "Файлы полностью идентичны и читаются по очереди"
              }
            ],
            "correct": "profiles"
          },
          {
            "id": "exit_code",
            "label": "2. Числовые значения кода возврата последней команды ($?) в Linux:",
            "options": [
              {
                "val": "exit_code",
                "text": "0 означает абсолютный УСПЕХ (zero errors); числа 1..255 означают различные ошибки"
              },
              {
                "val": "wrong1",
                "text": "0 означает ошибку; 1 означает успех выполнения команды"
              },
              {
                "val": "wrong2",
                "text": "$? возвращает время выполнения команды в миллисекундах"
              }
            ],
            "correct": "exit_code"
          },
          {
            "id": "chain_logic",
            "label": "3. Поведение логических операторов связки && и || в Bash:",
            "options": [
              {
                "val": "chain_logic",
                "text": "cmd1 && cmd2 выполнит cmd2 только при успехе cmd1 (код 0); cmd1 || cmd2 выполнит cmd2 только при ошибке cmd1"
              },
              {
                "val": "wrong1",
                "text": "&& запускает обе команды параллельно в фоне, а || объединяет их потоки через пайп"
              },
              {
                "val": "wrong2",
                "text": "Оператор || всегда выполняется первым независимо от результата первой команды"
              }
            ],
            "correct": "chain_logic"
          },
          {
            "id": "timer_persistent",
            "label": "4. Преимущество systemd .timer с параметром Persistent=true перед cron:",
            "options": [
              {
                "val": "timer_persistent",
                "text": "Если сервер был выключен во время назначенного часа, таймер выполнит задачу сразу после включения (cron пропустит)"
              },
              {
                "val": "wrong1",
                "text": "Таймеры systemd выполняют задачи без использования CPU"
              },
              {
                "val": "wrong2",
                "text": "Persistent=true автоматически отправляет отчёт в Telegram"
              }
            ],
            "correct": "timer_persistent"
          }
        ],
        "hint": "~/.bashrc — локальный конфиг, $?=0 — успех, && — только при успехе, Persistent=true выполняет пропущенные задачи!",
        "difficulty": "medium"
      },
      {
        "id": "t13_boss",
        "type": "terminal",
        "difficulty": "hard",
        "title": "120% Босс: Ночной продакшен-пайплайн бэкапов и переменных окружения",
        "matter": 40,
        "char": "batya",
        "story": "Экстренный запуск ночного цикла автоматизации: требуется настроить боевое окружение, создать резервный архив и поставить задачу в системный планировщик.",
        "requirements": [
          "Экспортировать переменную окружения APP_ENV со значением production",
          "Создать архив каталога конфигурации /etc в файл /root/etc-backup.tar.gz",
          "Зарегистрировать в системном файле /etc/crontab расписание запуска бэкапа в 03:00 ночи от пользователя root",
          "Проверить статус возврата последней операции через специальную переменную Bash"
        ],
        "checkRules": [
          "env_has:APP_ENV:production",
          "archive:/root/etc-backup.tar.gz",
          "file_has:/etc/crontab:0 3 * * *",
          "cmd:echo $?"
        ],
        "chips": [
          "export APP_ENV=production",
          "tar -czvf /root/etc-backup.tar.gz /etc",
          "echo \"0 3 * * * root /root/backup.sh\" >> /etc/crontab",
          "echo $?"
        ],
        "hint": "Выполни в терминале `export APP_ENV=production`, затем `tar -czvf /root/etc-backup.tar.gz /etc`, добавь задачу `echo \"0 3 * * * root /root/backup.sh\" >> /etc/crontab` и проверь `echo $?!`"
      }
    ]
  },
  {
    "level": 14,
    "questId": "q_admin",
    "cost": 60,
    "title": "Программирование на Bash: Шебанг #!/bin/bash, Аргументы $1..$#, Условия if и Циклы for",
    "shortDesc": "Шебанг #!/bin/bash, бит исполнения chmod 755, спецпеременные $1..$# и $@, операторы проверки файлов и чисел, циклы for и $(date).",
    "blocks": [
      {
        "type": "step_head",
        "step": 1,
        "title": "Шаг 1. Анатомия боевого Bash-скрипта: Шебанг #!/bin/bash и права на исполнение",
        "roadmap": "roadmap.sh: Bash Shebang & Execution Permissions"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "Здорово, будущий мастер автоматизации! Сисадмин, который делает одну и ту же рутинную операцию руками больше двух раз, тратит жизнь зря. Настоящий профи упаковывает команды в Bash-скрипт! Давай разберём, как ядро Linux запускает скрипты."
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. Магический шебанг (Shebang) <code>#!/bin/bash</code>:</h3>\n            <p>Любой скрипт автоматизации в Linux начинается с первой строки: <strong><code>#!/bin/bash</code></strong>. Это не комментарий!</p>\n            <p>Символы <code>#</code> (hash / шарп) и <code>!</code> (bang / бэнг) образуют двухбайтовое магическое число <strong><code>0x23 0x21</code></strong>. Когда ядро пытается исполнить текстовый файл, оно видит эти два байта, считывает путь к интерпретатору сразу за ними (<code>/bin/bash</code>) и передаёт файл на исполнение этой программе.</p>\n\n            <h3>2. Права доступа на запуск (Бит execute):</h3>\n            <p>Если создать скрипт через текстовый редактор, по умолчанию он получит права <code>644 (rw-r--r--)</code>. При попытке запуска ядро выдаст ошибку <strong><code>Permission denied</code></strong>!</p>\n            <p>Чтобы превратить текстовый файл в исполняемую программу, необходимо выдать флаг исполнения <strong><code>+x</code></strong>:</p>\n            <pre><code>chmod 755 healthcheck.sh    # или chmod +x healthcheck.sh</code></pre>\n\n            <h3>3. Запуск через <code>./script.sh</code> (Почему нужна точка со слэшем?):</h3>\n            <p>В целях безопасности текущий каталог (<code>.</code>) никогда не добавляется в системную переменную <code>$PATH</code>! Иначе злоумышленник мог бы положить в рабочую папку скрипт с именем <code>ls</code> и перехватить ввод рута. Поэтому программы из текущей папки всегда вызывают явно: <strong><code>./healthcheck.sh</code></strong>.</p>\n        "
      },
      {
        "type": "cmd_anatomy",
        "cmd": "./healthcheck.sh /etc/passwd",
        "desc": "Запуск боевого скрипта проверки целостности файлов с передачей пути в аргументе $1",
        "output": "[OK] Файл /etc/passwd существует и доступен для чтения",
        "notes": [
          "./ означает запуск бинарника или скрипта строго из текущей папки.",
          "/etc/passwd передаётся внутрь скрипта и попадает в позиционную переменную $1.",
          "Скрипт проверяет код завершения проверки и возвращает статус."
        ]
      },
      {
        "type": "task_ref",
        "taskId": "t14_e0"
      },
      {
        "type": "task_ref",
        "taskId": "t14n_1"
      },
      {
        "type": "step_head",
        "step": 2,
        "title": "Шаг 2. Позиционные параметры ($0, $1, $#, $@) и валидация аргументов",
        "roadmap": "roadmap.sh: Positional Parameters & Argument Validation"
      },
      {
        "type": "dialog",
        "char": "smith",
        "text": "Внимание на стандарт LPIC-1 [105.2]! Любой профессиональный скрипт должен уметь принимать аргументы командной строки и проверять их количество перед запуском."
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. Священные позиционные переменные в Bash:</h3>\n            <p>Когда ты вызываешь команду <code>./backup.sh /var/www /etc/nginx</code>, Bash автоматически раскладывает переданные параметры по специальным переменным:</p>\n            <ul>\n              <li><strong><code>$0</code></strong> — имя самого запускаемого скрипта (например, <code>./backup.sh</code>).</li>\n              <li><strong><code>$1</code>, <code>$2</code>, ... <code>$9</code></strong> — позиционные аргументы (первый аргумент, второй и т.д.). Для аргументов от 10 и выше используются фигурные скобки: <code>${10}</code>.</li>\n              <li><strong><code>$#</code></strong> — <strong>КОЛИЧЕСТВО переданных аргументов</strong> (Number of positional parameters). Если вызван <code>./script.sh file1 file2</code>, то <code>$#</code> равен <strong>2</strong>!</li>\n              <li><strong><code>$@</code></strong> — массив всех переданных аргументов в виде отдельных слов (<code>\"$1\" \"$2\" \"$3\"</code>). Идеально для циклов <code>for arg in \"$@\"</code>!</li>\n              <li><strong><code>$*</code></strong> — все переданные аргументы, склеенные в одну общую строку (<code>\"$1 $2 $3\"</code>).</li>\n              <li><strong><code>$$</code></strong> — PID (идентификатор процесса) текущего запущенного скрипта.</li>\n            </ul>\n\n            <h3>2. Валидация аргументов в начале скрипта:</h3>\n            <p>Всегда проверяй, что пользователь передал нужные данные, чтобы скрипт не выполнял пустые команды:</p>\n            <pre><code>if [ $# -eq 0 ]; then\n    echo \"Ошибка: укажите целевой файл для проверки!\"\n    exit 1\nfi</code></pre>\n        "
      },
      {
        "type": "task_ref",
        "taskId": "t14n_5"
      },
      {
        "type": "step_head",
        "step": 3,
        "title": "Шаг 3. Операторы проверки [ ... ] в Bash: файлы (-f, -d), строки (-z) и числа (-eq, -gt)",
        "roadmap": "roadmap.sh: Test Operators: Files, Strings & Numbers"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "Смотри внимательно, салага! Квадратная скобка <code>[</code> в Bash — это не просто украшение, это реальная команда <code>test</code>! И если ты забудешь пробелы вокруг скобок или перепутаешь сравнение строк со сравнением чисел, твой скрипт взорвётся прямо на проде!"
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. Квадратные скобки <code>[ ... ]</code> — это команда <code>test</code>!</h3>\n            <p>В синтаксисе Bash команда <code>[</code> — это синоним утилиты <code>test</code>. Поэтому после открывающей скобки <code>[</code> и перед закрывающей <code>]</code> <strong>ОБЯЗАТЕЛЬНО должны стоять пробелы</strong>!</p>\n            <pre><code>if [ -f \"$file\" ]; then    # ВЕРНО!\nif [-f \"$file\"]; then      # ФАТАЛЬНАЯ ОШИБКА: command [-f not found!</code></pre>\n\n            <h3>2. Операторы проверки файлов на диске:</h3>\n            <ul>\n              <li><strong><code>-f \"$file\"</code></strong> (regular file) — истинно, если путь существует и это <strong>обычный регулярный файл</strong> (не папка, не сокет, не блочное устройство).</li>\n              <li><strong><code>-d \"$path\"</code></strong> (directory) — истинно, если путь существует и это <strong>директория / каталог</strong>.</li>\n              <li><strong><code>-s \"$file\"</code></strong> (size) — файл существует и его размер строго больше 0 байт (не пустой).</li>\n              <li><strong><code>-x \"$file\"</code></strong> (executable) — файл существует и имеет права на выполнение.</li>\n            </ul>\n\n            <h3>3. Операторы проверки строк:</h3>\n            <ul>\n              <li><strong><code>-z \"$str\"</code></strong> (zero length) — истинно, если <strong>длина строки равна 0 (пустая строка)</strong>. Например, <code>[ -z \"$1\" ]</code> проверяет, что первый аргумент не передан.</li>\n              <li><strong><code>-n \"$str\"</code></strong> (nonzero) — истинно, если строка не пустая (длина больше 0).</li>\n              <li><strong><code>=</code></strong> / <strong><code>!=</code></strong> — проверка равенства / неравенства строк.</li>\n            </ul>\n\n            <h3>4. Операторы сравнения ЧИСЕЛ (Не путай со строками!):</h3>\n            <p>В простых скобках <code>[ ... ]</code> символы <code>&lt;</code> и <code>&gt;</code> означают перенаправление ввода/вывода! Для чисел в Bash используются только специальные буквенные операторы:</p>\n            <ul>\n              <li><strong><code>-eq</code></strong> (equal) — равно: <code>[ \"$count\" -eq 5 ]</code>.</li>\n              <li><strong><code>-ne</code></strong> (not equal) — не равно.</li>\n              <li><strong><code>-gt</code></strong> (greater than) — строго больше: <code>[ \"$count\" -gt 0 ]</code>.</li>\n              <li><strong><code>-lt</code></strong> (less than) — строго меньше.</li>\n              <li><strong><code>-ge</code></strong> / <strong><code>-le</code></strong> — больше либо равно / меньше либо равно.</li>\n            </ul>\n        "
      },
      {
        "type": "task_ref",
        "taskId": "t14n_4"
      },
      {
        "type": "step_head",
        "step": 4,
        "title": "Шаг 4. Подстановка команд $(command) и циклы автоматизации for / while",
        "roadmap": "roadmap.sh: Command Substitution & Loops"
      },
      {
        "type": "dialog",
        "char": "kira",
        "text": "Представь, что тебе надо проверить доступность 100 серверов или переименовать тысячи лог-файлов. Делать это построчно — безумие. Тут на помощь приходят циклы и подстановка команд!"
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. Подстановка вывода команд: <code>$(command)</code> (Command substitution):</h3>\n            <p>Чтобы результат работы системной команды вставить внутрь переменной или имени файла, используется синтаксис <strong><code>$(команда)</code></strong>:</p>\n            <pre><code>CURRENT_DATE=$(date +%F)\ntar -czf backup_$(date +%F).tar.gz /etc</code></pre>\n            <p>Результат вызова <code>date +%F</code> (например <code>2026-11-15</code>) прямо на лету подставится в строку. Устаревший синтаксис с обратными кавычками <code>`date`</code> использовать не рекомендуется из-за проблем с вложенностью.</p>\n\n            <h3>2. Цикл <code>for</code>: Перебор списков и файлов:</h3>\n            <pre><code>for f in *.log; do\n    echo \"Архивируем журнал: $f\"\n    cp \"$f\" \"$f.bak\"\ndone</code></pre>\n            <p>Цикл по очереди берёт каждый файл, подходящий под маску <code>*.log</code>, кладёт его имя в переменную <code>$f</code> и выполняет блок между <code>do</code> и <code>done</code>.</p>\n\n            <h3>3. Цикл <code>while</code>: Построчное чтение файлов:</h3>\n            <pre><code>while read -r host; do\n    ping -c 1 \"$host\"\ndone < servers.txt</code></pre>\n        "
      },
      {
        "type": "diagram",
        "ascii": "\n+-----------------------------------------------------------------------------------+\n|               ЛОГИЧЕСКИЙ ПАЙПЛАЙН BASH-АВТОМАТИЗАЦИИ                              |\n+-----------------------------------------------------------------------------------+\n| #!/bin/bash                     <- Шебанг указывает ядру интерпретатор            |\n| if [ -z \"$1\" ]; then            <- Проверка на пустой аргумент (-z)               |\n|     echo \"Укажите файл!\"        <- Ошибка валидации                               |\n|     exit 1                                                                        |\n| fi                                                                                |\n| for f in *.log; do              <- Цикл for по всем файлам логов                  |\n|     cp \"$f\" \"$f.$(date +%F)\"    <- Подстановка $(date) в имя архива               |\n| done                                                                              |\n+-----------------------------------------------------------------------------------+\n"
      },
      {
        "type": "task_ref",
        "taskId": "t14n_2"
      },
      {
        "type": "step_head",
        "step": 5,
        "title": "Шаг 5. Тема LPIC-1 [105.2]: Практика написания и кастомизация скриптов",
        "roadmap": "roadmap.sh: LPIC-1 105.2 Exam Scenarios"
      },
      {
        "type": "dialog",
        "char": "smith",
        "text": "Отличная работа! Тема 105.2 на экзамене LPIC-1 охватывает реальные сценарии: правильные условия проверки директорий и комбинирование циклов с подстановками команд."
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. Экзаменационный разбор LPIC-1: операторы проверки путей:</h3>\n            <p>В билетах часто проверяют разницу между <code>-d</code> и <code>-f</code>. Запомни:</p>\n            <ul>\n              <li>Проверка папки <code>/var/log</code>: <strong><code>[ -d /var/log ]</code></strong> вернёт <code>true</code>. Проверка <code>[ -f /var/log ]</code> вернёт <code>false</code>!</li>\n              <li>Проверка прав на запуск скрипта: <strong><code>[ -x script.sh ]</code></strong>.</li>\n            </ul>\n\n            <h3>2. Канонический цикл архивации логов:</h3>\n            <p>Шаблонная конструкция для бэкапа файлов на экзамене LPIC-1:</p>\n            <pre><code>for f in *.log; do cp \"$f\" \"$f.$(date +%F)\"; done</code></pre>\n            <p>Здесь объединены: обход по маске <code>for f in *.log</code>, тело цикла <code>do ... done</code> и подстановка даты <code>$(date +%F)</code>.</p>\n        "
      },
      {
        "type": "vocab"
      },
      {
        "type": "task_ref",
        "taskId": "t14n_3"
      },
      {
        "type": "task_ref",
        "taskId": "t14n_6"
      },
      {
        "type": "dialog",
        "char": "kira",
        "text": "Внимание, инженер! В продакшене упал критический конвейер обработки данных. Нам нужен отказоустойчивый Bash-скрипт промышленного уровня: с правильным шебангом #!/bin/bash, строгой валидацией количества аргументов $#, безопасной проверкой существования файла [ -f ... ], перехватом аварийного кода $? и интеграцией с планировщиком cron через права chmod 755. Собери идеальную архитектуру скрипта!"
      },
      {
        "type": "task_ref",
        "taskId": "t14_boss"
      }
    ],
    "vocab": [
      {
        "en": "shebang (#!/bin/bash)",
        "pron": "[шиба́нг]",
        "ru": "первая строка скрипта, указывающая ядру путь к интерпретатору",
        "assoc": "Без #!/bin/bash скрипт может запуститься не в той оболочке"
      },
      {
        "en": "interpreter",
        "pron": "[интёрпретер]",
        "ru": "интерпретатор командного сценария (/bin/bash, /bin/sh)",
        "assoc": "Читает и выполняет строки скрипта сверху вниз"
      },
      {
        "en": "positional arguments ($1, $2, $#)",
        "pron": "[пози́шнал а́ргьюментс]",
        "ru": "позиционные аргументы запуска скрипта и их счётчик $#",
        "assoc": "./deploy.sh prod -> $1 равно prod, $# равно 1"
      },
      {
        "en": "conditional expression ([ -f ], [ -d ])",
        "pron": "[конди́шнал экспре́шн]",
        "ru": "условная проверка существования файла (-f) или папки (-d)",
        "assoc": "Внутри квадратных скобок [ ... ] обязательны пробелы по краям!"
      },
      {
        "en": "command substitution $(...)",
        "pron": "[комма́нд сабститью́шн]",
        "ru": "подстановка вывода команды внутрь строки или переменной",
        "assoc": "backup_$(date +%F).tar.gz подставит текущую дату"
      },
      {
        "en": "loop (for ... do ... done)",
        "pron": "[луп]",
        "ru": "цикл перебора списка элементов или файлов по маске",
        "assoc": "for f in *.log; do gzip \"$f\"; done"
      }
    ],
    "tasks": [
      {
        "id": "t14_e0",
        "type": "lpic_fill",
        "difficulty": "easy",
        "title": "Разминка: Шебанг интерпретатора Bash",
        "matter": 10,
        "char": "smith",
        "story": "Проверка знания обязательной первой строки любого скрипта автоматизации в Linux.",
        "enQuestion": "<w k='which'>Which</w> two-character magic sequence starts a script to <w k='specify'>specify</w> the interpreter <w k='path'>path</w>? (Type the two characters, e.g. #! or //)",
        "acceptedAnswers": [
          "#!",
          "#!/bin/bash"
        ],
        "placeholder": "#! ...",
        "explainRu": "Верно! Последовательность `#!` (шебанг, hashbang) указывает ядру путь к исполняемому файлу интерпретатора.",
        "requirements": [
          "Вспомни два символа, открывающие шебанг.",
          "Введи последовательность в поле ввода."
        ],
        "hint": "Символ решётки и восклицательный знак: `#!` (или полный шебанг `#!/bin/bash`)!"
      },
      {
        "id": "t14n_1",
        "type": "terminal",
        "title": "Боевой Bash-скрипт: дай права +x скрипту healthcheck.sh и протестируй аргумент",
        "matter": 30,
        "char": "diego",
        "story": "В `/root/healthcheck.sh` лежит готовый скрипт проверки критических файлов с условием `if [ -f \"$1\" ]`, но он не запускается (`Permission denied`). Прочитай его код через `cat /root/healthcheck.sh`, выдай ему права `chmod 755 healthcheck.sh` и запусти с аргументом `./healthcheck.sh /etc/passwd`!",
        "requirements": [
          "Прочитай код скрипта командой `cat /root/healthcheck.sh`.",
          "Сделай скрипт исполняемым командой `chmod 755 healthcheck.sh`.",
          "Запусти скрипт с аргументом командой `./healthcheck.sh /etc/passwd`."
        ],
        "chips": [
          "cat /root/healthcheck.sh",
          "chmod 755 healthcheck.sh",
          "./healthcheck.sh /etc/passwd",
          "echo $?"
        ],
        "checkRules": [
          "cmd:cat /root/healthcheck.sh",
          "perm:healthcheck.sh:755",
          "script_tested"
        ],
        "hint": "Выполни по порядку `cat /root/healthcheck.sh`, `chmod 755 healthcheck.sh` и `./healthcheck.sh /etc/passwd`!",
        "difficulty": "medium"
      },
      {
        "id": "t14n_2",
        "type": "builder",
        "title": "Конструктор Автоматизации: собери безошибочный Bash-скрипт проверки бэкапов",
        "matter": 25,
        "char": "batya",
        "story": "Собираем боевой скрипт для ночного бэкапа! Собери правильный шебанг, условие проверки существования файла и подстановку даты в имя архива.",
        "requirements": [
          "Выбери правильный шебанг в первой строке.",
          "Выбери условие проверки наличия конфига на диске.",
          "Выбери синтаксис подстановки результата команды даты в имя бэкапа."
        ],
        "fields": [
          {
            "id": "shebang",
            "label": "1. Первая строка скрипта, указывающая ядру интерпретатор Bash:",
            "options": [
              {
                "val": "shebang",
                "text": "#!/bin/bash (правильный шебанг: # шарп + ! бэнг)"
              },
              {
                "val": "slash",
                "text": "//bin/bash (синтаксис комментариев C++/Java)"
              },
              {
                "val": "rem",
                "text": "REM bash (синтаксис пакетных файлов DOS)"
              }
            ],
            "correct": "shebang"
          },
          {
            "id": "iff",
            "label": "2. Условие проверки, что обычный файл /etc/nginx/nginx.conf существует на диске:",
            "options": [
              {
                "val": "iff",
                "text": "if [ -f /etc/nginx/nginx.conf ]; then (-f = обычный файл)"
              },
              {
                "val": "ifd",
                "text": "if [ -d /etc/nginx/nginx.conf ]; then (-d проверяет папку, а не файл!)"
              },
              {
                "val": "ifz",
                "text": "if [ -z /etc/nginx/nginx.conf ]; then (-z проверяет пустоту строки)"
              }
            ],
            "correct": "iff"
          },
          {
            "id": "sub",
            "label": "3. Синтаксис подстановки результата команды date +%F внутрь имени файла:",
            "options": [
              {
                "val": "sub",
                "text": "backup_$(date +%F).tar.gz (современный синтаксис $(команда))"
              },
              {
                "val": "quotes",
                "text": "backup_'date +%F'.tar.gz (одинарные кавычки запрещают выполнение)"
              },
              {
                "val": "perc",
                "text": "backup_%date%.tar.gz (синтаксис Windows CMD)"
              }
            ],
            "correct": "sub"
          }
        ],
        "hint": "Шебанг — `#!/bin/bash`, проверка файла — `[ -f ... ]`, подстановка вывода — `$(date +%F)`.",
        "difficulty": "medium"
      },
      {
        "id": "t14n_3",
        "type": "lpic_en",
        "title": "Тренажёр LPIC-1 [105.2]: Спецпеременные и условия в Bash-скриптах",
        "matter": 25,
        "char": "smith",
        "story": "Ключевой вопрос темы 105.2 на знание операторов проверки файлов!",
        "enQuestion": "Inside a Bash <w k='script'>script</w>, <w k='which'>which</w> conditional expression returns true if `/var/log` exists and is a <w k='directory'>directory</w>?",
        "options": [
          {
            "val": "a",
            "text": "[ -f /var/log ]"
          },
          {
            "val": "b",
            "text": "[ -d /var/log ]"
          },
          {
            "val": "c",
            "text": "[ -x /var/log ]"
          },
          {
            "val": "d",
            "text": "[ -z /var/log ]"
          }
        ],
        "correct": "b",
        "explainRu": "Великолепно! Флаг `-d` (directory) проверяет, что путь существует и является директорией! А `-f` (file) проверяет обычный файл, `-x` (executable) — права на запуск, `-z` (zero) — нулевую длину строки.",
        "requirements": [
          "Обрати внимание на слово `directory` (папка).",
          "Выбери флаг оператора test / [ ] для директорий."
        ],
        "hint": "Directory -> флаг `-d` -> `[ -d /var/log ]`!",
        "difficulty": "easy"
      },
      {
        "id": "t14n_4",
        "type": "builder",
        "title": "Мастер Условий: Операторы проверки файлов, строк и чисел в Bash",
        "matter": 20,
        "char": "batya",
        "story": "Собери правильные операторы для условий [ ... ] в Bash! Проверь регулярные файлы, директории, пустые строки и сравни числа.",
        "requirements": [
          "Выбери оператор проверки регулярного файла на диске.",
          "Выбери оператор проверки директории / каталога.",
          "Выбери оператор проверки пустой строки аргумента.",
          "Выбери операторы правильного сравнения чисел в отличие от строк."
        ],
        "fields": [
          {
            "id": "file_op",
            "label": "1. Проверка существования пути и того, что это ОБЫЧНЫЙ регулярный файл:",
            "options": [
              {
                "val": "f",
                "text": "[ -f \"$file\" ] (-f = file, истинно для обычных файлов, ложно для папок)"
              },
              {
                "val": "wrong1",
                "text": "[ -e \"$file\" ] (-e проверяет только существование, даже если это папка или сокет)"
              },
              {
                "val": "wrong2",
                "text": "[ -r \"$file\" ] (-r проверяет только права на чтение)"
              }
            ],
            "correct": "f"
          },
          {
            "id": "dir_op",
            "label": "2. Проверка существования пути и того, что это ДИРЕКТОРИЯ (папка):",
            "options": [
              {
                "val": "d",
                "text": "[ -d \"$path\" ] (-d = directory, истинно если объект существует и это каталог)"
              },
              {
                "val": "wrong1",
                "text": "[ -f \"$path\" ] (-f вернёт false для любой директории)"
              },
              {
                "val": "wrong2",
                "text": "[ -s \"$path\" ] (-s проверяет ненулевой размер файла)"
              }
            ],
            "correct": "d"
          },
          {
            "id": "zero_op",
            "label": "3. Проверка того, что аргумент ПУСТОЙ (длина строки равна нулю):",
            "options": [
              {
                "val": "z",
                "text": "[ -z \"$1\" ] (-z = zero length, истинно если аргумент не передан или пуст)"
              },
              {
                "val": "wrong1",
                "text": "[ -n \"$1\" ] (-n = nonzero, наоборот вернёт true если строка НЕ пустая)"
              },
              {
                "val": "wrong2",
                "text": "[ \"$1\" -eq 0 ] (числовое сравнение упадёт при передаче текстовой строки)"
              }
            ],
            "correct": "z"
          },
          {
            "id": "num_op",
            "label": "4. Сравнение целых чисел в квадратных скобках [ ... ] в отличие от строк:",
            "options": [
              {
                "val": "num",
                "text": "Для чисел используются флаги -eq, -ne, -lt, -gt (а операторы = и != сравнивают строки!)"
              },
              {
                "val": "wrong1",
                "text": "Числа в простых [ ] сравниваются математическими знаками < и >"
              },
              {
                "val": "wrong2",
                "text": "Оператор = автоматически приводит строки к числам при необходимости"
              }
            ],
            "correct": "num"
          }
        ],
        "hint": "-f для файлов, -d для папок, -z для пустой строки, -eq/-gt для чисел!",
        "difficulty": "medium"
      },
      {
        "id": "t14n_5",
        "type": "lpic_fill",
        "title": "Ввод ответа LPIC-1 [105.2]: Переменная количества переданных аргументов",
        "matter": 15,
        "char": "smith",
        "story": "Один из самых популярных вопросов сертификации LPIC-1 на тему позиционных параметров!",
        "enQuestion": "Inside a Bash script, which special variable holds the total number of positional parameters passed to the script? (Specify the variable in `$#` format.)",
        "acceptedAnswers": [
          "$#",
          "#"
        ],
        "placeholder": "Формат $# ...",
        "explainRu": "Точно в цель! Спецпеременная `$#` содержит общее количество переданных аргументов. `$0` — имя скрипта, `$1` — первый аргумент, а `$@` — массив всех аргументов!",
        "requirements": [
          "Найди в вопросе слова `total number of positional parameters`.",
          "Введи спецпеременную количества аргументов в формате `$#`."
        ],
        "hint": "Количество позиционных параметров обозначается решёткой -> `$#`!",
        "difficulty": "easy"
      },
      {
        "id": "t14n_6",
        "type": "lpic_en",
        "title": "Тренажёр LPIC-1 [105.2]: Подстановка даты $(date) и синтаксис цикла for",
        "matter": 20,
        "char": "smith",
        "story": "Стандартная задача автоматизации архивов на экзамене LPIC-1 Topic 105.2!",
        "enQuestion": "Which Bash loop correctly iterates over all `.log` files in the current directory and creates a timestamped backup copy using command substitution `$(date +%F)`?",
        "options": [
          {
            "val": "a",
            "text": "for f in *.log; do cp \"$f\" \"$f.$(date +%F)\"; done"
          },
          {
            "val": "b",
            "text": "for f in *.log { cp \"$f\" \"$f.%date%\"; }"
          },
          {
            "val": "c",
            "text": "foreach f (*.log) cp $f $f.'date +%F'"
          },
          {
            "val": "d",
            "text": "while [ *.log ]; do copy \"$f\" \"$(date +%F)\"; done"
          }
        ],
        "correct": "a",
        "explainRu": "Отлично! В Bash синтаксис цикла: `for var in list; do ...; done`, а результат выполнения команды вставляется через `$(command)`.",
        "requirements": [
          "Обрати внимание на синтаксис `for ... in ...; do ...; done`.",
          "Найди подстановку текущей даты через `$(date +%F)`."
        ],
        "hint": "`for f in *.log; do cp \"$f\" \"$f.$(date +%F)\"; done` -> вариант `a`!",
        "difficulty": "easy"
      },
      {
        "id": "t14_boss",
        "type": "builder",
        "difficulty": "hard",
        "title": "120% Босс: Архитектор Продакшен-Автоматизации (Bash, Аргументы, Файлы и Cron)",
        "matter": 40,
        "char": "kira",
        "story": "Собери полную архитектуру боевого скрипта резервного копирования для промышленного кластера.",
        "fields": [
          {
            "id": "f1_shebang",
            "label": "1. Шебанг и режим строгого завершения при ошибках (strict mode):",
            "options": [
              {
                "val": "shebang_strict",
                "text": "#!/bin/bash и директива set -euo pipefail — остановка скрипта при любой ошибке, пустой переменной или сбое в конвейере"
              },
              {
                "val": "shebang_sh",
                "text": "#!/bin/sh — запуск в режиме совместимости со старыми оболочками POSIX без поддержки расширенного синтаксиса Bash"
              },
              {
                "val": "shebang_none",
                "text": "Без первой строки шебанга — операционная система попытается запустить файл текущим шеллом пользователя"
              },
              {
                "val": "shebang_wrong",
                "text": "//bin/bash — некорректный комментарий в синтаксисе языков C++, ядро выдаст ошибку формата исполняемого файла"
              }
            ],
            "correct": "shebang_strict"
          },
          {
            "id": "f2_args",
            "label": "2. Валидация входных аргументов ($#): проверка, что передан ровно один обязательный аргумент:",
            "options": [
              {
                "val": "args_check",
                "text": "if [ \"$#\" -ne 1 ]; then echo \"Использование: $0 <файл>\"; exit 1; fi"
              },
              {
                "val": "args_zero",
                "text": "if [ \"$0\" -eq 1 ]; then echo \"Ошибка аргументов\"; exit 1; fi"
              },
              {
                "val": "args_all",
                "text": "if [ \"$@\" -gt 0 ]; then echo \"Нет аргументов\"; exit 1; fi"
              },
              {
                "val": "args_pid",
                "text": "if [ \"$$\" -ne 1 ]; then echo \"Неверный PID процесса\"; exit 1; fi"
              }
            ],
            "correct": "args_check"
          },
          {
            "id": "f3_file",
            "label": "3. Проверка существования регулярного файла источника ($1) перед его обработкой:",
            "options": [
              {
                "val": "file_test",
                "text": "if [ ! -f \"$1\" ]; then echo \"Ошибка: файл $1 не существует или не является регулярным!\"; exit 2; fi"
              },
              {
                "val": "file_dir",
                "text": "if [ -d \"$1\" ]; then echo \"Ошибка: это каталог, а не файл!\"; exit 2; fi"
              },
              {
                "val": "file_str",
                "text": "if [ \"$1\" == 0 ]; then echo \"Файл пустой!\"; exit 2; fi"
              },
              {
                "val": "file_exec",
                "text": "if [ -x \"/etc\" ]; then echo \"Каталог исполняемый!\"; exit 2; fi"
              }
            ],
            "correct": "file_test"
          },
          {
            "id": "f4_exit",
            "label": "4. Архивация данных и контроль кода завершения ($?):",
            "options": [
              {
                "val": "tar_exit",
                "text": "tar -czf \"$BACKUP_DIR/backup-$(date +%F).tar.gz\" \"$1\"; if [ $? -ne 0 ]; then echo \"Сбой архивации!\"; exit 3; fi"
              },
              {
                "val": "tar_bg",
                "text": "tar -czf backup.tar.gz \"$1\" & exit 0 — запуск в фоновом режиме с немедленным выходом без ожидания завершения"
              },
              {
                "val": "tar_pipe",
                "text": "tar -czf backup.tar.gz \"$1\" | echo $? — отправка потока данных tar на вход команды echo"
              },
              {
                "val": "tar_ignore",
                "text": "tar -czf backup.tar.gz \"$1\" || true — намеренное игнорирование аварийного кода возврата архиватора"
              }
            ],
            "correct": "tar_exit"
          },
          {
            "id": "f5_cron",
            "label": "5. Права доступа (chmod) и регламент автоматического запуска через cron:",
            "options": [
              {
                "val": "chmod_cron",
                "text": "chmod 755 /usr/local/bin/backup.sh и запись в crontab: 0 2 * * * root /usr/local/bin/backup.sh /etc/data"
              },
              {
                "val": "chmod_all",
                "text": "chmod 777 /usr/local/bin/backup.sh и запуск каждую минуту через crontab: * * * * *"
              },
              {
                "val": "chmod_read",
                "text": "chmod 644 /usr/local/bin/backup.sh без права на исполнение — планировщик выполнит скрипт как текстовый файл"
              },
              {
                "val": "chmod_visudo",
                "text": "visudo /usr/local/bin/backup.sh для автоматического добавления скрипта в автозагрузку системы"
              }
            ],
            "correct": "chmod_cron"
          }
        ],
        "requirements": [
          "Выбрать надёжный шебанг с директивой строгого контроля ошибок",
          "Сконфигурировать проверку количества переданных скрипту позиционных аргументов",
          "Определить корректный условный тест существования регулярного файла",
          "Настроить контроль целостности архивации через проверку кода возврата",
          "Задать корректные биты прав доступа и расписание ночного запуска"
        ],
        "hint": "Шебанг с `set -euo pipefail`, проверка аргументов `[ \"$#\" -ne 1 ]`, тест файла `[ ! -f \"$1\" ]`, контроль возврата `$? -ne 0` и запуск 755 через cron!"
      }
    ]
  },
  {
    "level": 15,
    "questId": "q_admin",
    "cost": 60,
    "title": "Службы systemd, Создание Своих .service Юнитов, Журнал journalctl и Время NTP",
    "shortDesc": "PID 1 systemd, управление systemctl, создание .service юнитов, daemon-reload, reload vs restart, logrotate, маскирование и timedatectl.",
    "blocks": [
      {
        "type": "step_head",
        "step": 1,
        "title": "Шаг 1. Жизненный цикл systemd (PID 1), управление службами и лог journalctl",
        "roadmap": "roadmap.sh: systemd Lifecycle & Services"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "Смотри, кто в доме хозяин! Когда ядро Linux загружает аппаратуру, оно порождает ровно один главный процесс с PID 1 — init-систему systemd. Она запускает все службы, следит за их здоровьем и ведёт системные логи. Управлять ей мы будем через утилиту <code>systemctl</code>."
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. systemd: Хозяин всех процессов (PID 1):</h3>\n            <p>Исторически в Linux службы запускались древней системой скриптов <code>SysVinit</code>: они стартовали строго последовательно и медленно. Современный стандарт — <strong><code>systemd</code></strong>. Это процесс с <strong><code>PID 1</code></strong>, предок абсолютно всех служб и демонов в ОС.</p>\n\n            <h3>2. Управление службами через <code>systemctl</code>:</h3>\n            <ul>\n              <li><code>systemctl start nginx</code> — запустить веб-сервер прямо сейчас (до ближайшей перезагрузки).</li>\n              <li><code>systemctl stop nginx</code> — остановить службу.</li>\n              <li><code>systemctl restart nginx</code> — перезапустить службу с нуля (с обрывом соединений клиентов).</li>\n              <li><code>systemctl status nginx</code> — проверить статус (Active: active (running), потребление памяти, PID процесса, свежие логи).</li>\n              <li><code>systemctl enable nginx</code> — прописать службу в <strong>автозагрузку при старте сервера</strong> (создаётся символическая ссылка в <code>/etc/systemd/system/multi-user.target.wants/</code>).</li>\n              <li><code>systemctl disable nginx</code> — убрать из автозагрузки.</li>\n              <li><code>systemctl enable --now nginx</code> — высший пилотаж: одновременно включает автозапуск и сразу запускает службу одной командой!</li>\n            </ul>\n\n            <h3>3. Системный бинарный журнал: <code>journalctl</code>:</h3>\n            <p>Раньше логи писались в текстовые файлы в <code>/var/log/</code>, а systemd собирает все логи демонов и ядра в единый индексированный журнал <code>journald</code>:</p>\n            <ul>\n              <li><strong><code>journalctl -u nginx</code></strong> — вывести логи конкретного юнита (Unit).</li>\n              <li><strong><code>journalctl -u nginx -f</code></strong> (follow) — следить за новыми строками логов в реальном времени (как <code>tail -f</code>).</li>\n              <li><strong><code>journalctl -n 50</code></strong> — вывести последние 50 строк журнала.</li>\n            </ul>\n        "
      },
      {
        "type": "cmd_anatomy",
        "cmd": "systemctl enable --now nginx",
        "desc": "Активация автозапуска веб-сервера при загрузке системы и немедленный запуск службы в одной команде",
        "output": "Created symlink /etc/systemd/system/multi-user.target.wants/nginx.service → /lib/systemd/system/nginx.service.",
        "notes": [
          "Флаг --now избавляет от необходимости писать две отдельные команды enable и start.",
          "Символическая ссылка в каталоге .wants сообщает systemd о необходимости поднять юнит при старте таргета multi-user.",
          "Проверить активность можно через systemctl is-active nginx или systemctl status nginx."
        ]
      },
      {
        "type": "task_ref",
        "taskId": "t15_e0"
      },
      {
        "type": "task_ref",
        "taskId": "t10_1"
      },
      {
        "type": "step_head",
        "step": 2,
        "title": "Шаг 2. Создание своего .service юнита и обязательный daemon-reload",
        "roadmap": "roadmap.sh: Custom Unit Construction & daemon-reload"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "Настоящий сисадмин и DevOps пишет свои сервисы регулярно — для микросервисов, телеграм-ботов или воркеров очередей. Давай разберём, из каких секций собирается файл юнита и почему после правок systemd требует священный пинок <code>daemon-reload</code>!"
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. Где живут юнит-файлы systemd:</h3>\n            <ul>\n              <li><code>/lib/systemd/system/</code> (или <code>/usr/lib/...</code>) — стандартные юниты из пакетов ОС (apt/yum). Руками их не правят!</li>\n              <li><strong><code>/etc/systemd/system/</code></strong> — <strong>папка администратора</strong>. Все твои собственные сервисы (например, <code>/etc/systemd/system/myapp.service</code>) и кастомные оверрайды кладутся строго сюда!</li>\n            </ul>\n\n            <h3>2. Анатомия юнит-файла .service (Три священные секции):</h3>\n            <pre><code>[Unit]\nDescription=My Custom Backend App\nAfter=network.target\n\n[Service]\nType=simple\nExecStart=/usr/bin/python3 /opt/app/server.py\nRestart=always\nRestartSec=5\nUser=appuser\n\n[Install]\nWantedBy=multi-user.target</code></pre>\n            <ol>\n              <li><strong>Секция <code>[Unit]</code>:</strong> Метаданные и зависимости. Директива <strong><code>After=network.target</code></strong> указывает очередность запуска: стартовать строго ПОСЛЕ того, как поднят сетевой стек.</li>\n              <li><strong>Секция <code>[Service]</code>:</strong> Как исполнять приложение.\n                <ul>\n                  <li><code>ExecStart=...</code> — полная абсолютная команда запуска бинарника.</li>\n                  <li><code>Restart=always</code> — автоматически поднимать упавший сервис при сбоях и ошибках.</li>\n                  <li><strong><code>User=appuser</code></strong> — запуск процесса от непривилегированного сервисного аккаунта ради безопасности (НИКОГДА не запускай кастомные бэкенды от root!).</li>\n                </ul>\n              </li>\n              <li><strong>Секция <code>[Install]</code>:</strong> Директива <strong><code>WantedBy=multi-user.target</code></strong> определяет, к какому таргету привязывается служба при вызове <code>systemctl enable</code>.</li>\n            </ol>\n\n            <h3>3. Священная команда <code>systemctl daemon-reload</code>:</h3>\n            <p>Когда ты создаёшь новый файл <code>.service</code> или меняешь параметры в существующем, systemd <strong>НЕ видит изменения на диске</strong>, потому что держит дерево юнитов в оперативной памяти!</p>\n            <p>Чтобы systemd перечитал все конфигурационные файлы с диска и обновил кэш зависимостей, ВСЕГДА выполняется:</p>\n            <pre><code>systemctl daemon-reload</code></pre>\n        "
      },
      {
        "type": "task_ref",
        "taskId": "t10_4"
      },
      {
        "type": "step_head",
        "step": 3,
        "title": "Шаг 3. Мягкая перезагрузка reload vs restart и ротация логов logrotate",
        "roadmap": "roadmap.sh: reload vs restart & logrotate Protection"
      },
      {
        "type": "dialog",
        "char": "kira",
        "text": "Представь продакшен крупного интернет-магазина: тысячи покупателей прямо сейчас оформляют заказы. Если ты сделаешь <code>systemctl restart nginx</code>, все активные соединения оборвутся! А если забудешь про ротацию логов — диск забьётся на 100%, и сервер намертво встанет."
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. Принципиальная разница: <code>reload</code> vs <code>restart</code>:</h3>\n            <ul>\n              <li><strong><code>systemctl restart &lt;service&gt;</code></strong> — <strong>холодный перезапуск</strong>. Служба полностью убивается (сигнал <code>SIGTERM</code> или <code>SIGKILL</code>), процесс завершается, освобождая память, и запускается заново. <strong>Все активные сетевые подключения клиентов жестко обрываются!</strong></li>\n              <li><strong><code>systemctl reload &lt;service&gt;</code></strong> — <strong>мягкая перезагрузка конфигурации на лету</strong> (Graceful reload). Демону отправляется сигнал <code>SIGHUP</code>. Главный процесс перечитывает изменённые конфиги и запускает новые рабочие воркеры, а старые воркеры спокойно дообслуживают уже подключенных клиентов и мирно закрываются. <strong>Ни один клиент не теряет связь!</strong></li>\n            </ul>\n\n            <h3>2. Служба <code>logrotate</code> и катастрофа «100% Disk Full»:</h3>\n            <p>Веб-серверы Nginx/Apache и базы данных пишут миллионы строк логов в <code>/var/log/</code>. Без контроля за пару месяцев лог-файлы займут сотни гигабайт, диск заполнится на 100% (ошибка <code>No space left on device</code>), и операционная система аварийно рухнет!</p>\n            <p>Для предотвращения катастрофы в Linux работает служба <strong><code>logrotate</code></strong> (настройки в <code>/etc/logrotate.conf</code> и <code>/etc/logrotate.d/</code>):</p>\n            <ul>\n              <li>Периодичность: <code>daily</code> или <code>weekly</code>.</li>\n              <li>Хранение: <code>rotate 14</code> (хранить архивы за последние 14 периодов, более старые удалять).</li>\n              <li>Сжатие: <code>compress</code> (сжимать старые логи алгоритмом <code>gzip</code>, экономя 90% диска).</li>\n              <li>Блок <code>postrotate ... endscript</code>: после ротации отправляет сигнал <code>systemctl reload</code> приложению, чтобы демон начал писать в новый чистый файл лога без перезапуска!</li>\n            </ul>\n        "
      },
      {
        "type": "task_ref",
        "taskId": "t10_5"
      },
      {
        "type": "step_head",
        "step": 4,
        "title": "Шаг 4. Статусы юнитов, маскирование (mask) и таргеты на экзамене LPIC-1 [101.3]",
        "roadmap": "roadmap.sh: Unit Masking & Runlevels"
      },
      {
        "type": "dialog",
        "char": "kira",
        "text": "На экзамене LPIC-1 тема 101.3 проверяет управление таргетами и блокировку служб через маскирование. Давай разберём, как навсегда запретить запуск нежелательной службы."
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. Таргеты systemd (Targets — замена уровней выполнения Runlevels):</h3>\n            <p>Вместо древних цифр Runlevel (0..6) systemd оперирует таргетами — группами связанных юнитов:</p>\n            <ul>\n              <li><strong><code>multi-user.target</code></strong> (бывший Runlevel 3) — стандартный серверный режим без графического интерфейса с поддержкой сети и многопользовательского входа.</li>\n              <li><strong><code>graphical.target</code></strong> (бывший Runlevel 5) — десктопный режим с графической оболочкой X11 / Wayland / GNOME.</li>\n              <li><strong><code>rescue.target</code></strong> (бывший Runlevel 1) — однопользовательский режим восстановления.</li>\n            </ul>\n\n            <h3>2. Маскирование юнитов: команда <code>systemctl mask</code>:</h3>\n            <p>Иногда отключения через <code>systemctl disable</code> недостаточно: если другая служба потребует отключенный сервис как зависимость, systemd всё равно его запустит!</p>\n            <p>Чтобы заблокировать службу <strong>железобетонно</strong>, используют маскирование:</p>\n            <pre><code>systemctl mask badservice.service</code></pre>\n            <p>Эта команда создаёт символическую ссылку из <code>/etc/systemd/system/badservice.service</code> на устройство черной дыры <strong><code>/dev/null</code></strong>. Теперь службу невозможно запустить ни вручную через start, ни автоматически, ни через другие сервисы! Снять блокировку можно командой <code>systemctl unmask</code>.</p>\n        "
      },
      {
        "type": "diagram",
        "ascii": "\n+-----------------------------------------------------------------------------------+\n|               АРХИТЕКТУРА СОСТОЯНИЙ СЛУЖБ В SYSTEMD                               |\n+-----------------------------------------------------------------------------------+\n|  systemctl start nginx     -> Запуск процесса прямо сейчас                        |\n|  systemctl enable nginx    -> Создание symlink в multi-user.target.wants          |\n|  systemctl reload nginx    -> Мягкий перечит конфига (SIGHUP) без обрыва клиентов  |\n|  systemctl restart nginx   -> Полная остановка (SIGTERM) и запуск с нуля          |\n|  systemctl mask nginx      -> Symlink на /dev/null (полный запрет любого запуска) |\n|  systemctl daemon-reload   -> Перечитывание юнит-файлов с диска в память systemd  |\n+-----------------------------------------------------------------------------------+\n"
      },
      {
        "type": "task_ref",
        "taskId": "t10_2"
      },
      {
        "type": "step_head",
        "step": 5,
        "title": "Шаг 5. Синхронизация времени NTP (timedatectl, chrony) и глубокий аудит journalctl",
        "roadmap": "roadmap.sh: Time Synchronization & Journal Audit"
      },
      {
        "type": "dialog",
        "char": "smith",
        "text": "Внимание! Тема 108.1 «Maintain system time» и практический аудит логов — основа стабильности серверов. Рассинхронизация часов даже на пару секунд ломает TLS-сертификаты, токены и репликацию баз данных!"
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. Протокол NTP (Network Time Protocol, порт 123/UDP):</h3>\n            <p>В распределённых системах идеальная точность часов критична: если время на серверах баз данных расходится на доли секунды, нарушается порядок транзакций, а токены аутентификации Kerberos и JWT признаются недействительными.</p>\n\n            <h3>2. Управление временем через <code>timedatectl</code>:</h3>\n            <p>В systemd за управление временем и часовыми поясами отвечает утилита <strong><code>timedatectl</code></strong>:</p>\n            <pre><code>Local time: Sun 2026-11-15 11:30:00 MSK\nUniversal time: Sun 2026-11-15 08:30:00 UTC\n      RTC time: Sun 2026-11-15 08:30:00\n     Time zone: Europe/Moscow (MSK, +0300)\nSystem clock synchronized: yes\n   NTP service: active</code></pre>\n            <ul>\n              <li>Проверить синхронизацию: параметр <strong><code>System clock synchronized: yes</code></strong>.</li>\n              <li>Сменить часовой пояс: <code>timedatectl set-timezone Europe/Moscow</code>.</li>\n              <li>Включить синхронизацию: <code>timedatectl set-ntp true</code>.</li>\n              <li>Демоны синхронизации в Linux: <strong><code>chrony</code></strong> (современный быстрый демон, утилита <code>chronyc sources</code>), <code>systemd-timesyncd</code> (легковесный клиент), <code>ntpd</code> (классический).</li>\n            </ul>\n\n            <h3>3. Практический аудит безопасности через <code>journalctl</code>:</h3>\n            <ul>\n              <li><code>journalctl -u sshd</code> — вывод журнала службы OpenSSH для расследования попыток несанкционированного входа.</li>\n              <li><code>journalctl -p err -b</code> — вывод только сообщений уровня Error и выше с момента текущей загрузки сервера (флаг <code>-b</code> = current boot).</li>\n            </ul>\n        "
      },
      {
        "type": "vocab"
      },
      {
        "type": "task_ref",
        "taskId": "t10_6"
      },
      {
        "type": "task_ref",
        "taskId": "t10_3"
      },
      {
        "type": "dialog",
        "char": "kira",
        "text": "Критический инцидент на фронтенд-сервере! Веб-сервер упал после сбоя таймингов кластера. Срочно исследуй системный журнал journalctl -u nginx, запусти службу командой systemctl start nginx, зафиксируй постоянный автозапуск systemctl enable nginx и проверь параметры времени через timedatectl. Трафик клиентов под угрозой!"
      },
      {
        "type": "task_ref",
        "taskId": "t15_boss"
      }
    ],
    "vocab": [
      {
        "en": "service unit (.service)",
        "pron": "[сё́рвис ю́нит]",
        "ru": "конфигурационный юнит фоновой службы в systemd",
        "assoc": "Свои юниты создаются в /etc/systemd/system/"
      },
      {
        "en": "enable vs start",
        "pron": "[энэ́йбл / старт]",
        "ru": "включить автозапуск при загрузке (enable) против запуска сейчас (start)",
        "assoc": "systemctl enable --now делает оба действия сразу"
      },
      {
        "en": "daemon-reload",
        "pron": "[ди́мон рило́уд]",
        "ru": "перечитывание изменённых .service файлов с диска в память systemd",
        "assoc": "Обязателен после правок в /etc/systemd/system/*.service"
      },
      {
        "en": "system journal (journalctl)",
        "pron": "[си́стем джё́рнал]",
        "ru": "единый бинарный журнал логов systemd",
        "assoc": "journalctl -u nginx -f показывает живой поток логов службы"
      },
      {
        "en": "clock synchronization (NTP)",
        "pron": "[клок синкронайзэ́йшн]",
        "ru": "синхронизация системных часов по точному времени NTP (123/UDP)",
        "assoc": "Проверяется через timedatectl и демон chrony"
      },
      {
        "en": "log rotation (logrotate)",
        "pron": "[лог ротэ́йшн]",
        "ru": "автоматическая нарезка, сжатие и очистка старых логов",
        "assoc": "Настраивается в /etc/logrotate.conf и /etc/logrotate.d/"
      }
    ],
    "tasks": [
      {
        "id": "t15_e0",
        "type": "lpic_fill",
        "difficulty": "easy",
        "title": "Разминка: Утилита управления службами systemd",
        "matter": 10,
        "char": "smith",
        "story": "Разминочный вопрос на знание основной консольной утилиты для управления юнитами systemd.",
        "enQuestion": "<w k='which'>Which</w> <w k='command'>command</w> is used to inspect, start, stop, and enable systemd services and units?",
        "acceptedAnswers": [
          "systemctl"
        ],
        "placeholder": "system...",
        "explainRu": "Точно! `systemctl` — главная утилита системного администратора для управления службами systemd.",
        "requirements": [
          "Вспомни главную утилиту systemd для управления сервисами.",
          "Введи имя команды."
        ],
        "hint": "Основная утилита контроля подсистемы systemd — `systemctl`!"
      },
      {
        "id": "t10_1",
        "type": "terminal",
        "title": "Реанимация прод-сервера: прочитай лог nginx, подними службу и добавь в автозапуск",
        "matter": 35,
        "char": "diego",
        "story": "Веб-сервер `nginx` лежит и не поднимается после ребута! Посмотри его журнал через `journalctl -u nginx`, запусти службу `systemctl start nginx` и включи её автозапуск `systemctl enable nginx`!",
        "requirements": [
          "Проверь системный журнал службы `nginx` (`journalctl -u nginx`).",
          "Запусти службу `nginx` прямо сейчас (`systemctl start nginx`).",
          "Включи автозапуск `nginx` при перезагрузке сервера (`systemctl enable nginx`)."
        ],
        "chips": [
          "systemctl status nginx",
          "journalctl -u nginx",
          "systemctl start nginx",
          "systemctl enable nginx"
        ],
        "hint": "Выполни `journalctl -u nginx`, затем `systemctl start nginx` и `systemctl enable nginx` (можешь проверить статус после этого через `systemctl status nginx`)!",
        "checkRules": [
          "cmd:journalctl -u nginx",
          "svc_running:nginx",
          "svc_enabled:nginx"
        ],
        "difficulty": "medium"
      },
      {
        "id": "t10_2",
        "type": "lpic_en",
        "title": "Тренажёр LPIC-1 [101.3]: Автозапуск systemd-службы при загрузке",
        "matter": 20,
        "char": "smith",
        "story": "Не перепутай `start` и `enable` на экзамене!",
        "enQuestion": "<w k='which'>Which</w> `systemctl` <w k='command'>command</w> configures `sshd.service` to start <w k='automatically'>automatically</w> <w k='every'>every</w> <w k='time'>time</w> the <w k='system'>system</w> boots (<w k='reboot'>reboot</w>)?",
        "options": [
          {
            "val": "a",
            "text": "systemctl start sshd.service"
          },
          {
            "val": "b",
            "text": "systemctl enable sshd.service"
          },
          {
            "val": "c",
            "text": "systemctl restart sshd.service"
          },
          {
            "val": "d",
            "text": "systemctl status sshd.service"
          }
        ],
        "correct": "b",
        "explainRu": "Чётко! `start` запускает только до ближайшей перезагрузки, а `enable` прописывает службу в автостарт!",
        "requirements": [
          "Найди в вопросе `start automatically every time the system boots`.",
          "Выбери подкоманду автозагрузки `systemctl`."
        ],
        "hint": "`automatically` при загрузке = `systemctl enable`!",
        "difficulty": "easy"
      },
      {
        "id": "t10_3",
        "type": "lpic_en",
        "title": "Тренажёр LPIC-1 [108.1]: Управление временем и NTP в systemd",
        "matter": 20,
        "char": "smith",
        "story": "Какая современная утилита `systemd` управляет часовым поясом и проверкой синхронизации NTP?",
        "enQuestion": "<w k='which'>Which</w> `systemd` utility <w k='displays'>displays</w> and changes the current <w k='system'>system</w> <w k='clock'>clock</w>, timezone, and NTP <w k='synchronization'>synchronization</w> <w k='status'>status</w>?",
        "options": [
          {
            "val": "a",
            "text": "crontab"
          },
          {
            "val": "b",
            "text": "timedatectl"
          },
          {
            "val": "c",
            "text": "journalctl"
          },
          {
            "val": "d",
            "text": "logrotate"
          }
        ],
        "correct": "b",
        "explainRu": "Изи! Time + Date + Control = `timedatectl`!",
        "requirements": [
          "Собери название из английских корней `time` + `date` + `ctl`.",
          "Выбери верную утилиту."
        ],
        "hint": "`timedatectl`!",
        "difficulty": "easy"
      },
      {
        "id": "t10_4",
        "type": "builder",
        "title": "Конструктор systemd: Секции [Unit], [Service], [Install] и daemon-reload",
        "matter": 20,
        "char": "batya",
        "story": "Собери надёжный файл службы .service для запуска бэкенда! Определи порядок запуска сети, параметры запуска процесса от юзера, таргет и команду после правок.",
        "requirements": [
          "Выбери правильную настройку секции [Unit] с зависимостью от сети.",
          "Выбери директивы запуска и перезапуска в [Service] без прав суперпользователя.",
          "Выбери целевой таргет в секции [Install].",
          "Укажи обязательную команду после создания или правки юнит-файла."
        ],
        "fields": [
          {
            "id": "unit_sec",
            "label": "1. Секция [Unit] — описание службы и очередность старта после сети:",
            "options": [
              {
                "val": "unit",
                "text": "[Unit] Description=App Server и After=network.target (старт после поднятия сети)"
              },
              {
                "val": "wrong1",
                "text": "[Unit] ExecStart=/usr/bin/app и TimeoutSec=30 (директивы перепутаны с Service)"
              },
              {
                "val": "wrong2",
                "text": "[Unit] RunLevel=3 и Network=Online (устаревший синтаксис)"
              }
            ],
            "correct": "unit"
          },
          {
            "id": "service_sec",
            "label": "2. Секция [Service] — команда запуска, авторестарт и непривилегированный пользователь:",
            "options": [
              {
                "val": "service",
                "text": "[Service] ExecStart=/usr/bin/app, Restart=always и User=appuser (запуск без root-прав)"
              },
              {
                "val": "wrong1",
                "text": "[Service] Command=run, AutoRecover=true и RootUser=yes"
              },
              {
                "val": "wrong2",
                "text": "[Service] Path=/opt/app, Background=yes и Sudo=true"
              }
            ],
            "correct": "service"
          },
          {
            "id": "install_sec",
            "label": "3. Секция [Install] — привязка автозапуска к уровню загрузки (Target):",
            "options": [
              {
                "val": "install",
                "text": "[Install] WantedBy=multi-user.target (стандартный многопользовательский серверный режим)"
              },
              {
                "val": "wrong1",
                "text": "[Install] RunMode=server.target (несуществующий таргет systemd)"
              },
              {
                "val": "wrong2",
                "text": "[Install] AutoStart=enabled (несуществующая директива)"
              }
            ],
            "correct": "install"
          },
          {
            "id": "daemon_reload",
            "label": "4. Обязательная команда после создания или редактирования любого юнит-файла:",
            "options": [
              {
                "val": "reload",
                "text": "systemctl daemon-reload (заставляет systemd перечитать все файлы с диска в память)"
              },
              {
                "val": "wrong1",
                "text": "reboot (полная перезагрузка физического сервера)"
              },
              {
                "val": "wrong2",
                "text": "rm -rf /tmp/systemd (очистка временных файлов)"
              }
            ],
            "correct": "reload"
          }
        ],
        "hint": "After=network.target в [Unit], User=appuser в [Service], WantedBy=multi-user.target и systemctl daemon-reload!",
        "difficulty": "medium"
      },
      {
        "id": "t10_5",
        "type": "builder",
        "title": "Инженер Надёжности: Ротация logrotate и тонкости reload vs restart",
        "matter": 15,
        "char": "kira",
        "story": "Защищаем продакшен от падений из-за переполнения диска и обрыва соединений клиентов! Разбери назначение logrotate и разницу reload vs restart.",
        "requirements": [
          "Определи, почему служба logrotate критически необходима на сервере.",
          "Различи последствия выполнения systemctl reload против systemctl restart."
        ],
        "fields": [
          {
            "id": "logrotate_why",
            "label": "1. Зачем на каждом Linux-сервере настраивают logrotate:",
            "options": [
              {
                "val": "disk_full",
                "text": "Без регулярной ротации и сжатия логи забьют 100% диска (No space left on device) и сервер упадёт"
              },
              {
                "val": "wrong1",
                "text": "logrotate пересылает логи в блокчейн для аудита"
              },
              {
                "val": "wrong2",
                "text": "logrotate увеличивает скорость работы процессора"
              }
            ],
            "correct": "disk_full"
          },
          {
            "id": "reload_vs_restart",
            "label": "2. Принципиальная разница между systemctl reload и systemctl restart:",
            "options": [
              {
                "val": "reload",
                "text": "reload мягко перечитывает конфиг без обрыва активных соединений клиентов; restart полностью убивает и перезапускает процесс"
              },
              {
                "val": "wrong1",
                "text": "reload перезагружает операционную систему, а restart перезапускает только одну службу"
              },
              {
                "val": "wrong2",
                "text": "restart работает без обрыва клиентов, а reload блокирует порт"
              }
            ],
            "correct": "reload"
          }
        ],
        "hint": "logrotate спасает от 100% disk full, а reload перечитывает конфиг без дропа клиентских сессий!",
        "difficulty": "easy"
      },
      {
        "id": "t10_6",
        "type": "terminal",
        "title": "Аудит времени и журнала: проверь NTP через timedatectl и лог journalctl",
        "matter": 15,
        "char": "diego",
        "story": "Проверь синхронизацию системного времени серверов по NTP утилитой `timedatectl`, а затем изучи журнал системных сообщений SSH-демона командой `journalctl -u sshd`!",
        "requirements": [
          "Проверь статус синхронизации времени и часовой пояс командой `timedatectl`.",
          "Прочитай журнал службы SSH командой `journalctl -u sshd`."
        ],
        "chips": [
          "timedatectl",
          "journalctl -u sshd",
          "journalctl -u nginx",
          "systemctl status sshd",
          "clear"
        ],
        "checkRules": [
          "cmd:timedatectl",
          "cmd:journalctl"
        ],
        "hint": "Выполни `timedatectl`, а затем `journalctl -u sshd`!",
        "difficulty": "easy"
      },
      {
        "id": "t15_boss",
        "type": "terminal",
        "difficulty": "hard",
        "title": "120% Босс: Авария балансировщика, анализ логов и фиксация времени",
        "matter": 40,
        "char": "kira",
        "story": "Аварийное восстановление веб-сервера: необходимо локализовать ошибку по журналу, запустить службу, настроить персистентный автозапуск и валидировать системное время.",
        "requirements": [
          "Исследовать диагностический журнал сбоя веб-сервера nginx",
          "Восстановить работу упавшей службы веб-сервера",
          "Включить автоматический старт службы nginx при загрузке системы",
          "Проинспектировать текущие настройки системного времени и статус NTP"
        ],
        "checkRules": [
          "cmd:journalctl",
          "svc_running:nginx",
          "svc_enabled:nginx",
          "cmd:timedatectl"
        ],
        "chips": [
          "journalctl -u nginx",
          "systemctl start nginx",
          "systemctl enable nginx",
          "timedatectl"
        ],
        "hint": "Выполни в терминале `journalctl -u nginx`, затем подними сервис `systemctl start nginx`, включи автозапуск `systemctl enable nginx` и проверь `timedatectl`!"
      }
    ]
  },
  {
    "level": 16,
    "questId": "q_admin",
    "cost": 60,
    "title": "Крепость SSH (Ключи ed25519, sshd_config) и Быстрая Переброска Файлов (scp, rsync)",
    "shortDesc": "Харденинг sshd_config, валидация sshd -t, ключи Ed25519, authorized_keys, known_hosts, ssh-copy-id и дельта-синхронизация rsync -avz.",
    "blocks": [
      {
        "type": "step_head",
        "step": 1,
        "title": "Шаг 1. Закалка SSH-демона (/etc/ssh/sshd_config) и проверка синтаксиса sshd -t",
        "roadmap": "roadmap.sh: SSH Hardening & sshd_config"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "Слушай боевую правду жизни! Стоит тебе купить VPS и повесить белый IP-адрес, как китайские ботнеты начинают долбить 22-й порт тысячами подборов паролей в секунду. Если оставить дефолтные настройки OpenSSH, твой сервер взломают до обеда! Давай закроем главные дыры."
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. Архитектура OpenSSH: Клиент и Демон:</h3>\n            <p>Пакет OpenSSH состоит из клиентской части (<code>/usr/bin/ssh</code>, <code>scp</code>, <code>ssh-keygen</code>) и серверного демона <strong><code>sshd</code></strong> (Secure Shell Daemon, <code>/usr/sbin/sshd</code>), слушающего входящие подключения по TCP-порту <code>22</code>.</p>\n\n            <h3>2. Три золотых правила харденинга в <code>/etc/ssh/sshd_config</code>:</h3>\n            <p>Главный конфигурационный файл демона находится по пути <strong><code>/etc/ssh/sshd_config</code></strong>. Продакшен-стандарт безопасности требует следующих директив:</p>\n            <ul>\n              <li><strong><code>PermitRootLogin no</code></strong> — <strong>ЗАПРЕТИТЬ прямой вход под пользователем root</strong>! Входить на сервер разрешено только обычным пользователем с последующим повышением через <code>sudo</code>. Это лишает ботнетов половины информации (имени суперпользователя).</li>\n              <li><strong><code>PasswordAuthentication no</code></strong> — <strong>ОТКЛЮЧИТЬ вход по паролям</strong>! Разрешена аутентификация строго по криптографическим ключам. Брутфорс паролей мгновенно становится бесполезен.</li>\n              <li><strong><code>PubkeyAuthentication yes</code></strong> — разрешить вход по открытым ключам.</li>\n            </ul>\n\n            <h3>3. Золотое правило проверки: утилита <code>sshd -t</code>:</h3>\n            <p>⚠️ <strong>СМЕРТЕЛЬНАЯ ОШИБКА ДЕВОПСА:</strong> Отредактировать <code>sshd_config</code> и сразу нажать <code>systemctl restart sshd</code>. Если в файле допущена опечатка, SSH-сервер аварийно упадёт, текущая сессия завершится, и ты <strong>навсегда потеряешь доступ к удалённому серверу</strong>!</p>\n            <p>Перед каждым перезапуском ВСЕГДА вызывай тест синтаксиса:</p>\n            <pre><code>sshd -t</code></pre>\n            <p>Если конфиг чист — команда завершается молча (код 0). Если есть ошибка — она выведет точный номер строки с опечаткой!</p>\n        "
      },
      {
        "type": "cmd_anatomy",
        "cmd": "sshd -t",
        "desc": "Проверка синтаксической корректности конфигурационного файла /etc/ssh/sshd_config перед перезапуском",
        "output": "(при отсутствии синтаксических ошибок команда завершается молча с кодом возврата 0)",
        "notes": [
          "Флаг -t (test mode) парсит весь файл конфигурации и выводит ошибки без запуска реального демона.",
          "Если обнаружена ошибка, выводится сообщение вида /etc/ssh/sshd_config line 42: Bad configuration option.",
          "Только после чистого вывода sshd -t разрешено выполнять systemctl restart sshd."
        ]
      },
      {
        "type": "task_ref",
        "taskId": "t16_e0"
      },
      {
        "type": "task_ref",
        "taskId": "t11_1"
      },
      {
        "type": "step_head",
        "step": 2,
        "title": "Шаг 2. Асимметричная криптография: Приватный ключ, Публичный замок и утилита ssh-copy-id",
        "roadmap": "roadmap.sh: Asymmetric SSH Keys & ssh-copy-id"
      },
      {
        "type": "dialog",
        "char": "kira",
        "text": "Смотри, как работает асимметричная криптография простыми словами! Представь замок и ключ: публичный замок ты можешь копировать на любые серверы мира, но открыть его может только твой единственный секретный ключ на ноутбуке!"
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. Асимметричная пара ключей: Приватный ключ vs Публичный замок:</h3>\n            <ul>\n              <li><strong>Приватный ключ (Private Key, например <code>~/.ssh/id_ed25519</code>):</strong> Секретная цифровая подпись. Он хранится строго на твоем локальном компьютере, защищается парольной фразой (Passphrase) и <strong>НИКОГДА и никому не передаётся</strong>! Права доступа на него обязаны быть строго <strong><code>600 (-rw-------)</code></strong>. Если права шире, SSH откажется его использовать!</li>\n              <li><strong>Публичный ключ (Public Key, <code>~/.ssh/id_ed25519.pub</code>):</strong> Открытый цифровой замок. Его можно без опаски публиковать на GitHub или отправлять на любые серверы.</li>\n            </ul>\n\n            <h3>2. Файл авторизации на сервере: <code>~/.ssh/authorized_keys</code>:</h3>\n            <p>Чтобы сервер пустил тебя без пароля, твой публичный ключ должен быть записан в файл <strong><code>~/.ssh/authorized_keys</code></strong> в домашнем каталоге удалённого пользователя.</p>\n            <p><strong>Строгие правила прав доступа (Permissions):</strong></p>\n            <ul>\n              <li>Папка <code>~/.ssh</code> — строго права <strong><code>700 (drwx------)</code></strong>.</li>\n              <li>Файл <code>~/.ssh/authorized_keys</code> — строго права <strong><code>600 (-rw-------)</code></strong>.</li>\n            </ul>\n\n            <h3>3. Быстрая безопасная доставка: утилита <code>ssh-copy-id</code>:</h3>\n            <p>Вручную создавать папки и копировать ключ долго. Для этого есть стандартная утилита:</p>\n            <pre><code>ssh-copy-id -i ~/.ssh/id_ed25519.pub user@server_ip</code></pre>\n            <p>Она автоматически подключается по SSH, создаёт директорию <code>~/.ssh</code> с правами <code>700</code>, файл <code>authorized_keys</code> с правами <code>600</code> и дописывает твой ключ в конец файла, не затирая другие ключи!</p>\n        "
      },
      {
        "type": "diagram",
        "ascii": "\n+-----------------------------------------------------------------------------------+\n|               АРХИТЕКТУРА АСИММЕТРИЧНЫХ SSH-КЛЮЧЕЙ                                |\n+-----------------------------------------------------------------------------------+\n| Твой ноутбук (Клиент):                          Удалённый сервер:                 |\n|  ~/.ssh/id_ed25519     (Приватный ключ, 600)                                      |\n|       │                                                                           |\n|       └────── ssh-copy-id ─────────────────>  ~/.ssh/authorized_keys (600)        |\n|                                                (Публичный замок)                  |\n|  ~/.ssh/known_hosts    (Отпечатки серверов)                                       |\n|  (Защита от атак Man-in-the-Middle)                                               |\n+-----------------------------------------------------------------------------------+\n"
      },
      {
        "type": "task_ref",
        "taskId": "t16n_3"
      },
      {
        "type": "task_ref",
        "taskId": "t11_2"
      },
      {
        "type": "step_head",
        "step": 3,
        "title": "Шаг 3. Архитектура безопасности SSH, защита от MITM и протоколы синхронизации",
        "roadmap": "roadmap.sh: known_hosts, MITM Defense & rsync vs scp"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "Пока новички копируют файлы через устаревший scp и игнорируют предупреждения терминала, профессионалы знают: отпечаток сервера в <code>known_hosts</code> — это твоя броня от перехвата трафика Man-in-the-Middle, а дельта-синхронизация <code>rsync</code> экономит гигабайты трафика!"
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. Защита от атак перехвата: файл <code>~/.ssh/known_hosts</code>:</h3>\n            <p>Когда ты в первый раз подключаешься к серверу (<code>ssh user@host</code>), терминал спрашивает: <em>«The authenticity of host cannot be established. Are you sure you want to continue connecting?»</em>.</p>\n            <p>При ответе <code>yes</code> клиент SSH сохраняет отпечаток публичного ключа сервера (Host Key Fingerprint) в локальный файл <strong><code>~/.ssh/known_hosts</code></strong>.</p>\n            <p>Если при следующем подключении хакер подменит DNS или проведёт атаку <strong>Man-in-the-Middle (MITM)</strong>, подсунув свой сервер-перехватчик, SSH мгновенно заблокирует вход с грозным предупреждением: <strong><code>WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!</code></strong>. Это защищает твои пароли и ключи от кражи!</p>\n\n            <h3>2. Дельта-синхронизация <code>rsync</code> против устаревшего <code>scp</code>:</h3>\n            <ul>\n              <li><strong>Утилита <code>scp</code> (Secure Copy):</strong> копирует файлы по протоколу SSH от начала до конца «в лоб». Если в архиве размером 10 Гб изменился один байт, <code>scp</code> будет повторно качать все 10 Гб целиком!</li>\n              <li><strong>Утилита <code>rsync</code> (Remote Sync):</strong> шедевр алгоритмической мысли! Она разбивает файлы на блоки, вычисляет контрольные суммы и пересылает по SSH <strong>ТОЛЬКО ИЗМЕНИВШИЕСЯ ДЕЛЬТА-БЛОКИ</strong>!</li>\n              <li>Флаги золотого стандарта: <strong><code>rsync -avz</code></strong>:\n                <ul>\n                  <li><strong><code>-a</code> (archive):</strong> архивация — рекурсивно копирует папки, сохраняя права доступа, владельцев, временные метки (mtime) и символические ссылки.</li>\n                  <li><strong><code>-v</code> (verbose):</strong> подробный вывод передачи файлов.</li>\n                  <li><strong><code>-z</code> (compress):</strong> сжатие данных алгоритмом gzip прямо на лету в процессе передачи по сети.</li>\n                </ul>\n              </li>\n            </ul>\n        "
      },
      {
        "type": "task_ref",
        "taskId": "t16n_2"
      },
      {
        "type": "step_head",
        "step": 4,
        "title": "Шаг 4. Современный алгоритм Ed25519, боевой деплой и экзамен LPIC-1 [110.3]",
        "roadmap": "roadmap.sh: Ed25519 Generation & Remote Deploy"
      },
      {
        "type": "dialog",
        "char": "smith",
        "text": "Внимание на стандарт LPIC-1 Topic 110.3! Современный стандарт криптографии — алгоритм на эллиптических кривых Ed25519: генерация ключей и безопасная переброска релизов."
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. Выбор криптографии: Почему Ed25519 вытеснил RSA:</h3>\n            <p>Старый алгоритм RSA требует ключей длиной 4096 бит, медленно генерируется и уязвим к атакам по времени. Современный стандарт де-факто — <strong>Ed25519</strong> (Edwards-curve Digital Signature Algorithm):</p>\n            <ul>\n              <li>Длина ключа всего 256 бит, при этом криптостойкость выше, чем у RSA-4096!</li>\n              <li>Генерируется за доли секунды, подпись и проверка происходят мгновенно.</li>\n            </ul>\n            <p>Команда генерации современной пары ключей:</p>\n            <pre><code>ssh-keygen -t ed25519 -C \"admin@company.com\"</code></pre>\n            <p>(Флаг <code>-t</code> задаёт тип алгоритма, <code>-C</code> — поясняющий комментарий/email в конце публичного ключа).</p>\n\n            <h3>2. Практика боевого деплоя через rsync:</h3>\n            <p>Синхронизация локальной папки <code>/etc</code> на резервный сервер бэкапов через SSH:</p>\n            <pre><code>rsync -avz /etc backup@10.0.0.20:/backups/</code></pre>\n        "
      },
      {
        "type": "vocab"
      },
      {
        "type": "task_ref",
        "taskId": "t16n_1"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "Вражеские боты сканируют открытые порты! Срочно сгенерируй криптостойкую пару ключей ssh-keygen -t ed25519, ограничь права на приватный ключ командой chmod 600 id_ed25519, заблокируй вход root через echo \"PermitRootLogin no\" >> /etc/ssh/sshd_config и перебрось резервную копию конфигураций на оффсайт-сервер через rsync -avz /etc backup@10.0.0.20:/backups/. Быстро, боец!"
      },
      {
        "type": "task_ref",
        "taskId": "t16_boss"
      }
    ],
    "vocab": [
      {
        "en": "key pair (public & private)",
        "pron": "[ки пэа]",
        "ru": "асимметричная пара SSH-ключей (публичный .pub и секретный приватный)",
        "assoc": "Генерируется командой ssh-keygen -t ed25519"
      },
      {
        "en": "PermitRootLogin no",
        "pron": "[перми́т рут ло́гин ноу]",
        "ru": "запрет прямого входа под суперпользователем root по SSH",
        "assoc": "Главная директива защиты в /etc/ssh/sshd_config"
      },
      {
        "en": "authorized_keys",
        "pron": "[о́сораизд киз]",
        "ru": "список доверенных публичных ключей на сервере (~/.ssh/authorized_keys)",
        "assoc": "Требует строгих прав 600 (и 700 на саму папку ~/.ssh)"
      },
      {
        "en": "known_hosts",
        "pron": "[но́ун хостс]",
        "ru": "база крипто-отпечатков серверов на клиенте (защита от перехвата MITM)",
        "assoc": "Проверяется при каждом подключении по SSH"
      },
      {
        "en": "delta synchronization (rsync)",
        "pron": "[де́льта синкронайзэ́йшн]",
        "ru": "умная передача только изменившихся блоков файлов по сети",
        "assoc": "rsync -avz экономит гигабайты трафика при бэкапах"
      },
      {
        "en": "remote host",
        "pron": "[римо́ут хост]",
        "ru": "удалённый сервер, к которому подключаются по SSH",
        "assoc": "Формат адресации: user@remote_host:/path"
      }
    ],
    "tasks": [
      {
        "id": "t16_e0",
        "type": "lpic_fill",
        "difficulty": "easy",
        "title": "Разминка: Проверка конфигурации sshd",
        "matter": 10,
        "char": "smith",
        "story": "Безопасный перезапуск SSH-демона невозможен без предварительной проверки синтаксиса конфигурации.",
        "enQuestion": "<w k='which'>Which</w> <w k='command'>command</w> with flag -t tests the OpenSSH server configuration <w k='file'>file</w> for syntax errors before restart?",
        "acceptedAnswers": [
          "sshd -t",
          "/usr/sbin/sshd -t"
        ],
        "placeholder": "sshd ...",
        "explainRu": "В точку! Команда `sshd -t` проверяет синтаксис `/etc/ssh/sshd_config` и спасает от потери удалённого доступа к серверу.",
        "requirements": [
          "Вспомни команду проверки конфигурации демона SSH.",
          "Введи команду вместе с ключом проверки."
        ],
        "hint": "Тест конфигурации сервера OpenSSH: `sshd -t`!"
      },
      {
        "id": "t11_1",
        "type": "terminal",
        "title": "Харденинг SSH: закрой дыру PermitRootLogin и перезапусти sshd",
        "matter": 35,
        "char": "diego",
        "story": "Аудит безопасности показал, что в `/etc/ssh/sshd_config` разрешён прямой вход под рутом! Запиши настройку `PermitRootLogin no` в `/etc/ssh/sshd_config`, проверь синтаксис `sshd -t` и перезапусти демон `systemctl restart sshd`!",
        "requirements": [
          "Пропиши директиву `PermitRootLogin no` в файл `/etc/ssh/sshd_config`.",
          "Проверь корректность конфига командой `sshd -t`.",
          "Перезапусти службу SSH командой `systemctl restart sshd`."
        ],
        "chips": [
          "cat /etc/ssh/sshd_config",
          "echo \"PermitRootLogin no\" >> /etc/ssh/sshd_config",
          "sshd -t",
          "systemctl restart sshd"
        ],
        "hint": "Выполни в терминале `echo \"PermitRootLogin no\" >> /etc/ssh/sshd_config`, затем протестируй `sshd -t` и примени `systemctl restart sshd`!",
        "checkRules": [
          "file_has:/etc/ssh/sshd_config:PermitRootLogin no",
          "cmd:sshd -t",
          "cmd:systemctl restart sshd"
        ],
        "difficulty": "medium"
      },
      {
        "id": "t11_2",
        "type": "lpic_en",
        "title": "Тренажёр LPIC-1 [110.3]: Куда кладутся публичные SSH-ключи?",
        "matter": 20,
        "char": "smith",
        "story": "Один из самых любимых вопросов экзамена 102-500 по SSH!",
        "enQuestion": "In <w k='which'>which</w> <w k='file'>file</w> inside a <w k='user'>user</w>'s `~/.ssh/` <w k='directory'>directory</w> must <w k='public'>public</w> SSH keys be placed to <w k='allow'>allow</w> passwordless <w k='remote'>remote</w> <w k='login'>login</w>?",
        "options": [
          {
            "val": "a",
            "text": "~/.ssh/known_hosts"
          },
          {
            "val": "b",
            "text": "~/.ssh/authorized_keys"
          },
          {
            "val": "c",
            "text": "~/.ssh/id_rsa"
          },
          {
            "val": "d",
            "text": "~/.ssh/sshd_config"
          }
        ],
        "correct": "b",
        "explainRu": "Квест 3 позади! `authorized_keys` — список ключей, которым разрешён вход в этот аккаунт (а `known_hosts` хранит отпечатки серверов, к которым подключался ты сам).",
        "requirements": [
          "Различи `authorized_keys` (кто может войти ко мне) и `known_hosts` (куда ходил я).",
          "Выбери верный файл в `~/.ssh/`."
        ],
        "hint": "Авторизованные ключи для входа -> `~/.ssh/authorized_keys`!",
        "difficulty": "easy"
      },
      {
        "id": "t16n_1",
        "type": "terminal",
        "title": "Ключи и Деплой: сгенерируй пару ключей ed25519 и синхронизируй релиз через rsync",
        "matter": 30,
        "char": "diego",
        "story": "Настраиваем бесшовный деплой! Сгенерируй современную криптографическую пару ключей командой `ssh-keygen -t ed25519`, а затем отправь папку `/etc` на резервный сервер умной дельта-синхронизацией `rsync -avz /etc backup@10.0.0.20:/backups/`!",
        "requirements": [
          "Сгенерируй SSH-ключи командой `ssh-keygen -t ed25519`.",
          "Выполни дельта-синхронизацию командой `rsync -avz /etc backup@10.0.0.20:/backups/`."
        ],
        "chips": [
          "ssh-keygen -t ed25519",
          "ls -la",
          "rsync -avz /etc backup@10.0.0.20:/backups/"
        ],
        "checkRules": [
          "ssh_keygen_done",
          "rsync_done"
        ],
        "hint": "Запусти `ssh-keygen -t ed25519`, а следом `rsync -avz /etc backup@10.0.0.20:/backups/`!",
        "difficulty": "easy"
      },
      {
        "id": "t16n_2",
        "type": "builder",
        "title": "Крипто-Архитектор SSH: Ключи ed25519, known_hosts и rsync",
        "matter": 20,
        "char": "batya",
        "story": "Собираем образцовую защиту SSH! Разложи по полочкам приватный и публичный ключи, права доступа, защиту от MITM в known_hosts и дельта-синхронизацию rsync.",
        "requirements": [
          "Определи правила хранения и права приватного ключа id_ed25519.",
          "Выбери место размещения публичного ключа на удалённом сервере.",
          "Определи назначение файла known_hosts на клиенте.",
          "Выдели главное преимущество дельта-копирования rsync перед scp."
        ],
        "fields": [
          {
            "id": "priv_key",
            "label": "1. Приватный SSH-ключ (id_ed25519) и правила безопасности:",
            "options": [
              {
                "val": "priv",
                "text": "Хранится на клиенте с правами 600, секретный, никогда не передаётся по сети и не копируется на чужие серверы"
              },
              {
                "val": "wrong1",
                "text": "Копируется в /etc/ssh/ на все серверы для проверки подлинности"
              },
              {
                "val": "wrong2",
                "text": "Должен иметь права 777, чтобы демон sshd мог его прочитать"
              }
            ],
            "correct": "priv"
          },
          {
            "id": "pub_key",
            "label": "2. Публичный ключ (id_ed25519.pub) и файл authorized_keys на сервере:",
            "options": [
              {
                "val": "pub",
                "text": "Размещается в ~/.ssh/authorized_keys на сервере (права 600 на файл, 700 на папку ~/.ssh)"
              },
              {
                "val": "wrong1",
                "text": "Хранится в /etc/shadow рядом с хэшами паролей пользователей"
              },
              {
                "val": "wrong2",
                "text": "Заменяет собой конфигурационный файл sshd_config"
              }
            ],
            "correct": "pub"
          },
          {
            "id": "known_hosts",
            "label": "3. Назначение файла ~/.ssh/known_hosts на клиентской машине:",
            "options": [
              {
                "val": "kh",
                "text": "Хранит отпечатки серверов для защиты от атак подмены сервера (Man-in-the-Middle)"
              },
              {
                "val": "wrong1",
                "text": "Список заблокированных IP-адресов, с которых запрещено подключаться"
              },
              {
                "val": "wrong2",
                "text": "Хранит историю всех выполненных пользователем команд"
              }
            ],
            "correct": "kh"
          },
          {
            "id": "rsync_delta",
            "label": "4. Главное преимущество rsync -avz перед утилитой scp:",
            "options": [
              {
                "val": "rsync",
                "text": "rsync передаёт по сети только изменившиеся дельта-блоки файлов со сжатием (scp слепо копирует всё заново)"
              },
              {
                "val": "wrong1",
                "text": "scp быстрее, так как не использует шифрование трафика"
              },
              {
                "val": "wrong2",
                "text": "rsync работает только внутри одной локальной сети"
              }
            ],
            "correct": "rsync"
          }
        ],
        "hint": "id_ed25519 с правами 600, authorized_keys на сервере, known_hosts защищает от MITM, rsync передаёт дельты!",
        "difficulty": "medium"
      },
      {
        "id": "t16n_3",
        "type": "lpic_fill",
        "title": "Ввод ответа LPIC-1 [110.3]: Утилита копирования публичного SSH-ключа",
        "matter": 15,
        "char": "smith",
        "story": "Один из самых практичных вопросов сертификации OpenSSH на LPIC-1 Topic 110.3!",
        "enQuestion": "Which command-line utility securely copies a local user's public SSH key to a remote server's `~/.ssh/authorized_keys` file and automatically sets the correct permissions on the remote file and directory?",
        "acceptedAnswers": [
          "ssh-copy-id",
          "/usr/bin/ssh-copy-id"
        ],
        "placeholder": "Имя утилиты (например ssh-...)",
        "explainRu": "Идеально! Утилита `ssh-copy-id` (например `ssh-copy-id user@remote-host`) подключается по SSH, создаёт `~/.ssh` (права 700) и дописывает публичный ключ в `authorized_keys` (права 600)!",
        "requirements": [
          "Вспомни стандартную утилиту пакета OpenSSH для безопасной доставки ключей.",
          "Введи команду `ssh-copy-id`."
        ],
        "hint": "Команда копирования идентификатора SSH на сервер -> `ssh-copy-id`!",
        "difficulty": "easy"
      },
      {
        "id": "t16_boss",
        "type": "terminal",
        "difficulty": "hard",
        "title": "120% Босс: Фортификация периметра SSH и аварийный оффсайт-деплой",
        "matter": 40,
        "char": "batya",
        "story": "Комплексная защита шлюза: генерация стойких криптографических ключей, изоляция приватных сертификатов, блокировка опасных директив и синхронизация конфигов.",
        "requirements": [
          "Сгенерировать асимметричную ключевую пару современного стандарта ed25519",
          "Установить защищённый режим доступа 600 на файл закрытого приватного ключа",
          "Отключить удалённую аутентификацию суперпользователя в файле sshd_config",
          "Выполнить синхронизацию каталога системных настроек на резервный сервер"
        ],
        "checkRules": [
          "ssh_keygen_done",
          "perm:id_ed25519:600",
          "file_has:/etc/ssh/sshd_config:PermitRootLogin no",
          "rsync_done"
        ],
        "chips": [
          "ssh-keygen -t ed25519",
          "chmod 600 id_ed25519",
          "echo \"PermitRootLogin no\" >> /etc/ssh/sshd_config",
          "rsync -avz /etc backup@10.0.0.20:/backups/"
        ],
        "hint": "Выполни в терминале `ssh-keygen -t ed25519`, затем ограничь доступ `chmod 600 id_ed25519`, заблокируй вход root `echo \"PermitRootLogin no\" >> /etc/ssh/sshd_config` и запусти `rsync -avz /etc backup@10.0.0.20:/backups/`!"
      }
    ]
  },
  {
    "level": 17,
    "questId": "q_admin",
    "cost": 65,
    "title": "Лимиты Ресурсов (ulimit, cgroups), Мандатная Защита (AppArmor/SELinux) и Анатомия Контейнеров",
    "shortDesc": "Too many open files, лимиты ulimit -n и limits.conf, архитектура контейнеров Namespaces vs cgroups, AppArmor и SELinux (Enforcing vs Permissive).",
    "blocks": [
      {
        "type": "step_head",
        "step": 1,
        "title": "Шаг 1. Авария Too many open files, лимиты дескрипторов ulimit и файл /etc/security/limits.conf",
        "roadmap": "roadmap.sh: ulimit & /etc/security/limits.conf"
      },
      {
        "type": "dialog",
        "char": "batya",
        "text": "Представь картину: Чёрная Пятница, интернет-магазин рвут на части сотни тысяч покупателей, и тут веб-сервер намертво встаёт с ошибкой <code>Too many open files</code>! Почему это происходит и как сисадмин спасает прод?"
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. Принцип Unix «Всё есть файл» и файловые дескрипторы:</h3>\n            <p>В Linux любое сетевое соединение (входящий TCP-сокет от браузера клиента), открытый файл на диске, пайп или сокет базы данных для ядра являются <strong>файловыми дескрипторами (File Descriptors)</strong> — целыми числами 0, 1, 2, 3...</p>\n            <p>Чтобы один зависший или вредоносный процесс не сожрал всю память сервера, ядро устанавливает лимиты ресурсов на процессы.</p>\n\n            <h3>2. Дефолтный лимит 1024 и авария <code>Too many open files</code>:</h3>\n            <p>В большинстве дистрибутивов по умолчанию лимит открытых файлов на один процесс составляет всего <strong>1024 дескриптора</strong>! Веб-сервер Nginx под нагрузкой держит тысячи одновременных веб-сокетов: лимит мгновенно исчерпывается, Nginx перестаёт принимать новых клиентов и сыплет в лог авариями <code>Too many open files</code>.</p>\n\n            <h3>3. Временное поднятие лимита: утилита <code>ulimit -n</code>:</h3>\n            <pre><code>ulimit -n 65535</code></pre>\n            <p>(Поднимает лимит дескрипторов до 65535 для текущей оболочки и запускаемых из неё процессов). Флаг <code>-Sn</code> задаёт мягкий лимит (soft limit), а <code>-Hn</code> — жесткий лимит (hard limit).</p>\n\n            <h3>4. Постоянное закрепление: <code>/etc/security/limits.conf</code>:</h3>\n            <p>Команда <code>ulimit</code> действует только до закрытия терминала. Чтобы лимиты действовали всегда, их прописывают через модуль PAM в конфигурационном файле <strong><code>/etc/security/limits.conf</code></strong> (и каталоге <code>/etc/security/limits.d/</code>):</p>\n            <pre><code>*       soft    nofile  65535\n*       hard    nofile  65535\n*       soft    nproc   4096\n*       hard    nproc   4096</code></pre>\n            <ul>\n              <li><strong><code>nofile</code></strong> — максимальное количество открытых файлов / сокетов.</li>\n              <li><strong><code>nproc</code></strong> — максимальное количество процессов пользователя (защита от fork-бомбы).</li>\n            </ul>\n        "
      },
      {
        "type": "cmd_anatomy",
        "cmd": "ulimit -n 65535",
        "desc": "Увеличение лимита одновременно открытых файловых дескрипторов до 65535 для текущей сессии",
        "output": "(команда выполняется молча, проверка значения через ulimit -n)",
        "notes": [
          "Флаг -n задает ограничение на максимальное число открытых файлов и сокетов.",
          "Для постоянного действия директива прописывается в /etc/security/limits.conf.",
          "Значение 65535 является индустриальным стандартом для Highload веб-серверов."
        ]
      },
      {
        "type": "task_ref",
        "taskId": "t17n_4"
      },
      {
        "type": "step_head",
        "step": 2,
        "title": "Шаг 2. Анатомия Docker: Namespaces (видимость) vs cgroups (лимиты ресурсов)",
        "roadmap": "roadmap.sh: Docker Internals: Namespaces & cgroups"
      },
      {
        "type": "dialog",
        "char": "kira",
        "text": "А теперь срываем покровы! Вокруг Docker накручено море хайпа, но с точки зрения ядра Linux никакого «контейнера» как отдельной сущности в природе не существует! Это обычные процессы хоста, упакованные в два механизма ядра..."
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. Из чего состоит контейнер: Два кита ядра Linux:</h3>\n            <p>Контейнеризация — это не магия, а комбинация двух фундаментальных механизмов ядра Linux:</p>\n\n            <h3>Кит № 1: <code>Namespaces</code> (Пространства имён — ИЗОЛЯЦИЯ ВИДИМОСТИ):</h3>\n            <p>Namespaces отвечают на вопрос: <em>«Что процесс может видеть вокруг себя?»</em>. Они разделяют системные ресурсы так, что каждый контейнер думает, будто он один на всём компьютере:</p>\n            <ul>\n              <li><strong>PID Namespace:</strong> Изолирует дерево процессов. Внутри контейнера твое приложение видит себя с <code>PID 1</code>, не видя остальных процессов хоста.</li>\n              <li><strong>NET Namespace:</strong> Изолирует сетевой стек. У контейнера свой виртуальный интерфейс <code>eth0</code>, своя таблица маршрутов и свои порты (два разных контейнера могут слушать порт 80).</li>\n              <li><strong>MNT Namespace:</strong> Изолирует точки монтирования файловой системы (контейнер видит только свой образ rootfs).</li>\n              <li><strong>IPC, UTS</strong> (своё имя хоста hostname), <strong>USER</strong> (UID 0 внутри контейнера может быть непривилегированным юзером на хосте).</li>\n            </ul>\n\n            <h3>Кит № 2: <code>cgroups</code> (Control Groups — КВОТИРОВАНИЕ РЕСУРСОВ):</h3>\n            <p>cgroups отвечают на вопрос: <em>«Сколько ресурсов процессу разрешено съесть?»</em>:</p>\n            <ul>\n              <li>Ограничивают процессорное время (квоты CPU).</li>\n              <li>Ограничивают оперативную память (<code>memory.max</code>) — при попытке сожрать больше ядро убивает процесс через OOM Killer.</li>\n              <li>Квотируют скорость дискового ввода-вывода (IOPS).</li>\n            </ul>\n\n            <h3>3. Контейнер vs Виртуальная Машина: В чем разница?</h3>\n            <p>Виртуальная машина (KVM, VMware) эмулирует виртуальное железо через гипервизор и запускает <strong>своё отдельное ядро гостевой ОС</strong>. Это тяжело (гигабайты памяти на каждую VM) и долго (минуты на старт).</p>\n            <p>Контейнеры Docker <strong>делят ОБЩЕЕ ядро хостовой ОС Linux</strong>! Это просто изолированные процессы хоста, поэтому они стартуют за миллисекунды и практически не расходуют память впустую. Список запущенных прямо сейчас контейнеров, их образов и проброшенных портов на хосте проверяется базовой командой <strong><code>docker ps</code></strong> (а все контейнеры, включая остановленные — <code>docker ps -a</code>).</p>\n        "
      },
      {
        "type": "diagram",
        "ascii": "\n+-----------------------------------------------------------------------------------+\n|               АНАТОМИЯ ИЗОЛЯЦИИ КОНТЕЙНЕРА В ЯДРЕ LINUX                          |\n+-----------------------------------------------------------------------------------+\n|               КОНТЕЙНЕР (Процесс в изоляции)                                      |\n|  ┌────────────────────────────────────────────────────────┐                      |\n|  │ Namespaces (Что видит):  PID=1, свой eth0, своя rootfs │                      |\n|  ├────────────────────────────────────────────────────────┤                      |\n|  │ cgroups (Сколько ест):   CPU limit 2 cores, RAM 1GB    │                      |\n|  └────────────────────────────┬───────────────────────────┘                      |\n|                               ▼                                                   |\n|             ЕДИНОЕ ОБЩЕЕ ЯДРО ХОСТОВОЙ ОС LINUX                                   |\n|             (Shared Kernel, общий планировщик, общее железо)                      |\n+-----------------------------------------------------------------------------------+\n"
      },
      {
        "type": "task_ref",
        "taskId": "t17n_2"
      },
      {
        "type": "step_head",
        "step": 3,
        "title": "Шаг 3. Мандатный контроль доступа: AppArmor vs SELinux и режимы Enforcing / Permissive",
        "roadmap": "roadmap.sh: Mandatory Access Control: AppArmor & SELinux"
      },
      {
        "type": "dialog",
        "char": "smith",
        "text": "Внимание на передовую безопасность Linux! Даже если злоумышленник получил права суперпользователя root внутри уязвимого сервиса, системы мандатного контроля доступа (MAC) не дадут ему пробить систему!"
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. Дискреционный (DAC) vs Мандатный (MAC) контроль доступа:</h3>\n            <ul>\n              <li><strong>DAC (Discretionary Access Control):</strong> Стандартные права Linux (rwx, chmod, chown). Владелец файла сам решает, кому дать права, а суперпользователь <code>root</code> может делать абсолютно всё. Если демон взломают, хакер получает полную власть.</li>\n              <li><strong>MAC (Mandatory Access Control):</strong> Надстройка ядра (LSM — Linux Security Modules). Ядро проверяет каждое действие программы по строгому профилю политик, <strong>ДАЖЕ ЕСЛИ ПРОЦЕСС ЗАПУЩЕН ОТ ROOT</strong>! Если в профиле Nginx не прописано право читать <code>/etc/shadow</code>, ядро заблокирует попытку, даже если Nginx работает под root!</li>\n            </ul>\n\n            <h3>2. AppArmor vs SELinux:</h3>\n            <ul>\n              <li><strong>AppArmor</strong> (по умолчанию в Ubuntu, Debian, openSUSE): опирается на пути к файлам. Профили лежат в <code>/etc/apparmor.d/</code>. Проверка статуса: <strong><code>aa-status</code></strong>.</li>\n              <li><strong>SELinux</strong> (Security-Enhanced Linux, по умолчанию в RHEL, CentOS, Fedora): использует метки контекста безопасности (Labels / Type Enforcement). Проверка статуса: <code>getenforce</code> или <code>sestatus</code>.</li>\n            </ul>\n\n            <h3>3. Два фундаментальных режима работы: <code>Enforcing</code> vs <code>Permissive</code>:</h3>\n            <ul>\n              <li><strong><code>Enforcing</code> (в AppArmor — <em>enforce</em>):</strong> <strong>Боевой режим принудительной защиты</strong>. Любая попытка процесса выйти за рамки разрешенного профиля <strong>НЕМЕДЛЕННО БЛОКИРУЕТСЯ ядром</strong>, а событие атаки записывается в аудит-лог (<code>/var/log/audit/audit.log</code> или <code>dmesg</code>).</li>\n              <li><strong><code>Permissive</code> (в AppArmor — <em>complain</em>):</strong> <strong>Режим обучения / отладки</strong>. Ядро <strong>НЕ блокирует</strong> подозрительные действия, разрешая процессу выполниться, но пишет подробное предупреждение о нарушении в аудит-журнал. Администраторы включают этот режим при настройке новых служб, чтобы найти все нужные вызовы без падения сервиса в продакшене!</li>\n            </ul>\n        "
      },
      {
        "type": "task_ref",
        "taskId": "t17n_5"
      },
      {
        "type": "task_ref",
        "taskId": "t17n_1"
      },
      {
        "type": "step_head",
        "step": 4,
        "title": "Шаг 4. Сертификационный экзамен Linux Pro: ulimit, безопасность и изоляция контейнеров",
        "roadmap": "roadmap.sh: Linux Pro Exam Wrap-up"
      },
      {
        "type": "dialog",
        "char": "smith",
        "text": "Поздравляю с выходом на профессиональный уровень! Темы лимитов ресурсов, изоляции ядра и безопасности — ключевые критерии отбора на позициях Middle/Senior Linux Administrator."
      },
      {
        "type": "theory",
        "html": "\n            <h3>1. Обобщение проверки лимитов процессов:</h3>\n            <p>Команда <code>ulimit -n</code> отображает лимит дескрипторов текущей командной строки. А чтобы посмотреть действующие лимиты любого уже запущенного на сервере процесса (например веб-сервера с PID 4242), читают псевдофайл ядра:</p>\n            <pre><code>cat /proc/4242/limits</code></pre>\n\n            <h3>2. Готовность к сертификации Linux Pro и LPIC-1:</h3>\n            <p>Теперь ты понимаешь глубокую внутреннюю архитектуру Linux: от прав на файлы и шебанга скриптов до пространств имён контейнеров, мандатной защиты AppArmor/SELinux и тюнинга дескрипторов в <code>/etc/security/limits.conf</code>!</p>\n        "
      },
      {
        "type": "vocab"
      },
      {
        "type": "task_ref",
        "taskId": "t17n_3"
      },
      {
        "type": "dialog",
        "char": "kira",
        "text": "Тревога в кластере! Вредоносный процесс перегрузил CPU и забил дескрипторы. Срочно уничтожь процесс ликвидатором kill -9 6660, сними лимит дескрипторов командой ulimit -n 65535, проверь мандатную защиту утилитой aa-status и проинспектируй изолированные контейнеры через docker ps. Спасай сервер!"
      },
      {
        "type": "task_ref",
        "taskId": "t17_boss"
      }
    ],
    "vocab": [
      {
        "en": "file descriptors (nofile)",
        "pron": "[фа́йл дескри́пторс]",
        "ru": "файловые дескрипторы открытых файлов и сетевых сокетов",
        "assoc": "При исчерпании вылетает Too many open files; поднимается через ulimit -n"
      },
      {
        "en": "resource limits (limits.conf)",
        "pron": "[ри́сорс ли́митс]",
        "ru": "постоянные системные ограничения ресурсов на процессы и юзеров",
        "assoc": "Хранятся в /etc/security/limits.conf (soft и hard лимиты)"
      },
      {
        "en": "namespaces",
        "pron": "[нэ́ймспэйсез]",
        "ru": "пространства имён ядра для изоляции видимости контейнера",
        "assoc": "Изолируют PID, сеть, точки монтирования и hostname в Docker"
      },
      {
        "en": "control groups (cgroups)",
        "pron": "[си-групс]",
        "ru": "механизм ядра для жёсткого квотирования CPU, RAM и диска",
        "assoc": "Не даёт одному контейнеру съесть всю оперативную память хоста"
      },
      {
        "en": "Mandatory Access Control (MAC)",
        "pron": "[ма́ндатори э́ксес контро́л]",
        "ru": "мандатный контроль доступа ядра (AppArmor и SELinux)",
        "assoc": "Ограничивает программу по профилю даже под правами root"
      },
      {
        "en": "enforcing vs permissive",
        "pron": "[энфо́рсинг / перми́ссив]",
        "ru": "режим жёсткой блокировки нарушений против режима только логирования",
        "assoc": "Проверяется через aa-status (AppArmor) или getenforce (SELinux)"
      }
    ],
    "tasks": [
      {
        "id": "t17n_4",
        "type": "lpic_fill",
        "title": "Ввод ответа Linux Pro: Конфигурационный файл постоянных лимитов PAM",
        "matter": 15,
        "char": "smith",
        "story": "Классический вопрос собеседований Linux Pro и экзаменов на знание pam_limits!",
        "enQuestion": "Which configuration file is used by the pam_limits module to set persistent system resource limits (such as `nofile` for maximum open files and `nproc` for processes) for users and groups? (Specify the full path.)",
        "acceptedAnswers": [
          "/etc/security/limits.conf"
        ],
        "placeholder": "Полный путь от / ...",
        "explainRu": "В десятку! Именно файл `/etc/security/limits.conf` (и каталог `/etc/security/limits.d/`) определяет soft и hard лимиты PAM на открытые файлы (`nofile`) и процессы (`nproc`)!",
        "requirements": [
          "Обрати внимание на слова `pam_limits module` и `limits (such as nofile)`.",
          "Впиши полный путь `/etc/security/limits.conf`."
        ],
        "hint": "Каталог безопасности в `/etc`: `/etc/security/limits.conf`!",
        "difficulty": "easy"
      },
      {
        "id": "t17n_1",
        "type": "terminal",
        "title": "Тюнинг Highload-сервера: подними лимит файловых дескрипторов ulimit и проверь контейнеры",
        "matter": 30,
        "char": "diego",
        "story": "Прокси-сервер жалуется на `Too many open files`! Проверь текущий лимит дескрипторов `ulimit -n`, подними его до `65535` командой `ulimit -n 65535`, проверь профиль безопасности `aa-status` и убедись, что контейнер работает через `docker ps`!",
        "requirements": [
          "Подними лимит открытых файлов командой `ulimit -n 65535`.",
          "Проверь статус профилей AppArmor командой `aa-status`.",
          "Проверь запущенные контейнеры командой `docker ps`."
        ],
        "chips": [
          "ulimit -n",
          "ulimit -n 65535",
          "aa-status",
          "docker ps"
        ],
        "checkRules": [
          "ulimit_raised",
          "cmd:aa-status",
          "cmd:docker ps"
        ],
        "hint": "Выполни `ulimit -n 65535`, затем `aa-status` и `docker ps`!",
        "difficulty": "medium"
      },
      {
        "id": "t17n_2",
        "type": "builder",
        "title": "Инженер Контейнеризации: Namespaces vs cgroups vs Виртуалка",
        "matter": 25,
        "char": "batya",
        "story": "Разбираем анатомию контейнеров без маркетинговой шелухи! Определи, какие механизмы ядра Linux делают Docker возможным.",
        "requirements": [
          "Выбери механизм ядра, отвечающий за изоляцию видимости процессов и сети.",
          "Выбери механизм ядра, ограничивающий аппетиты контейнера по CPU и памяти.",
          "Определи фундаментальное отличие Docker-контейнера от Виртуальной Машины."
        ],
        "fields": [
          {
            "id": "ns",
            "label": "1. Механизм ядра Linux, изолирующий видимость процессов, сети и ФС контейнера («что контейнер видит»):",
            "options": [
              {
                "val": "ns",
                "text": "Namespaces (пространства имён ядра: PID, NET, MNT, IPC, UTS)"
              },
              {
                "val": "iptables",
                "text": "iptables (сетевой фаервол фильтрации пакетов)"
              },
              {
                "val": "cron",
                "text": "cron (планировщик запуска задач по времени)"
              }
            ],
            "correct": "ns"
          },
          {
            "id": "cg",
            "label": "2. Механизм ядра Linux, ограничивающий аппетиты контейнера по CPU и гигабайтам ОЗУ («сколько ресурсов можно съесть»):",
            "options": [
              {
                "val": "cg",
                "text": "cgroups (Control Groups — ограничение и учет CPU, RAM, IO)"
              },
              {
                "val": "swap",
                "text": "Swap (раздел подкачки на диске)"
              },
              {
                "val": "bios",
                "text": "BIOS Setup (настройки прошивки материнской платы)"
              }
            ],
            "correct": "cg"
          },
          {
            "id": "shared",
            "label": "3. Главное отличие Docker-контейнера от классической Виртуальной Машины (VM):",
            "options": [
              {
                "val": "shared",
                "text": "Контейнеры делят общее ядро Linux хоста и стартуют за миллисекунды (в VM крутится своё отдельное ядро и виртуальное железо)"
              },
              {
                "val": "vm_faster",
                "text": "Виртуальная машина стартует быстрее и не требует оперативной памяти"
              },
              {
                "val": "same",
                "text": "Никакой разницы нет, это синонимы"
              }
            ],
            "correct": "shared"
          }
        ],
        "hint": "Видимость процессов изолируют `Namespaces`, аппетиты по RAM/CPU режут `cgroups`, а контейнеры делят общее ядро хоста.",
        "difficulty": "medium"
      },
      {
        "id": "t17n_3",
        "type": "lpic_en",
        "title": "Тренажёр Linux Pro: Лимит открытых файловых дескрипторов (ulimit)",
        "matter": 25,
        "char": "smith",
        "story": "Классическая задача с собеседований Senior DevOps и билетов Linux!",
        "enQuestion": "A high-traffic web <w k='server'>server</w> logs the <w k='error'>error</w> `Too many open files`. <w k='which'>Which</w> shell builtin <w k='displays'>displays</w> or modifies the maximum number of open <w k='file'>file</w> descriptors for the current <w k='shell'>shell</w> and its child <w k='processes'>processes</w>?",
        "options": [
          {
            "val": "a",
            "text": "ulimit -n"
          },
          {
            "val": "b",
            "text": "df -i"
          },
          {
            "val": "c",
            "text": "umask -n"
          },
          {
            "val": "d",
            "text": "nice -n"
          }
        ],
        "correct": "a",
        "explainRu": "В яблочко! Встроенная команда `ulimit` с ключом `-n` (number of open files) управляет лимитом файловых дескрипторов. А постоянные лимиты прописываются в `/etc/security/limits.conf`!",
        "requirements": [
          "Свяжи ошибку `Too many open files` с управлением лимитами процессов.",
          "Выбери встроенную команду оболочки для изменения лимита открытых файлов."
        ],
        "hint": "User Limits для открытых файлов -> `ulimit -n`!",
        "difficulty": "easy"
      },
      {
        "id": "t17n_5",
        "type": "lpic_en",
        "title": "Тренажёр Linux Pro: Режимы мандатного доступа Enforcing vs Permissive",
        "matter": 20,
        "char": "smith",
        "story": "Ключевое различие режимов мандатного контроля доступа (MAC) в AppArmor и SELinux!",
        "enQuestion": "In Linux Mandatory Access Control systems (such as SELinux and AppArmor), what is the key difference between `Enforcing` (enforce) and `Permissive` (complain) modes?",
        "options": [
          {
            "val": "a",
            "text": "Enforcing blocks and logs policy violations; Permissive allows unauthorized actions but logs them for debugging"
          },
          {
            "val": "b",
            "text": "Permissive blocks unauthorized actions without logging; Enforcing permits all actions silently"
          },
          {
            "val": "c",
            "text": "Enforcing disables kernel security modules; Permissive activates container cgroups"
          },
          {
            "val": "d",
            "text": "Permissive mode is used in production, while Enforcing mode is only used during installation"
          }
        ],
        "correct": "a",
        "explainRu": "Великолепно! В режиме `Enforcing` (или enforce) ядро реально блокирует операции, нарушающие профиль безопасности. В режиме `Permissive` (или complain) ядро разрешает действие, но пишет предупреждение в журнал аудита для отладки!",
        "requirements": [
          "Найди ключевую разницу: блокировка с логом против пропуска действия с записью в аудит.",
          "Выбери вариант `a`."
        ],
        "hint": "Enforcing блокирует с записью в лог, Permissive только логирует -> вариант `a`!",
        "difficulty": "easy"
      },
      {
        "id": "t17_boss",
        "type": "terminal",
        "difficulty": "hard",
        "title": "120% Босс: Ликвидация криптомайнера, расширение дескрипторов и аудит контейнеров",
        "matter": 40,
        "char": "kira",
        "story": "Критическое устранение последствий атаки: ликвидация мошеннического процесса, снятие ресурсных ограничений файловой системы и аудит безопасности контейнерного окружения.",
        "requirements": [
          "Уничтожить вредоносный процесс криптомайнера с идентификатором 6660",
          "Повысить максимальный лимит открытых файловых дескрипторов сессии до 65535",
          "Проверить активность профилей мандатной системы контроля доступа AppArmor",
          "Проинспектировать работоспособность изолированных Docker-контейнеров на хосте"
        ],
        "checkRules": [
          "proc_killed:6660",
          "ulimit_raised",
          "cmd:aa-status",
          "cmd:docker ps"
        ],
        "chips": [
          "kill -9 6660",
          "ulimit -n 65535",
          "aa-status",
          "docker ps"
        ],
        "hint": "Выполни в терминале `kill -9 6660`, затем увеличь лимит `ulimit -n 65535`, проверь защиту `aa-status` и запусти `docker ps`!"
      }
    ]
  }
];
})();
