// SysRush v5.3 Master Curriculum Assembler (24 Levels • 170 Tasks: Easy / Medium / Hard 120% Boss + Manual CLI)
window.CURRICULUM = {
  quests: [
    {
      id: "q_hw",
      num: 1,
      icon: "🖥️",
      lpicBadge: "LPIC-1 • 101, 103.1 & 104",
      title: "Квест 1: Железо, LVM, Загрузка и База CLI",
      subtitle: "От начинки серверов (CPU, кэш, ОЗУ A2+B2, БП/Online ИБП, PCIe, GPT, fstab, LVM, UEFI/GRUB, RAID) до выживания в консоли (пути, $PATH, man, which).",
      levels: [0, 1, 2, 3, 4, 5]
    },
    {
      id: "q_linux",
      num: 2,
      icon: "🐧",
      lpicBadge: "LPIC-1 • 102–104 (roadmap.sh CLI)",
      title: "Квест 2: Потоки, Текст, Пакеты, Процессы и Права",
      subtitle: "Стандарты FHS, потоки stdin/stdout/stderr (2>&1, tee), архивы tar и find, комбайны cut/sort/uniq/sed/awk, пакеты apt/dpkg/rpm, сигналы kill/nohup/nice и магия chmod/umask/SUID.",
      levels: [6, 7, 8, 9, 10, 11]
    },
    {
      id: "q_admin",
      num: 3,
      icon: "⚙️",
      lpicBadge: "LPIC-1 • 105–108, 110 & Containers",
      title: "Квест 3: Админка, Bash-Скрипты, Systemd и Контейнеры",
      subtitle: "Пользователи (/etc/shadow, visudo), переменные окружения и cron, программирование на Bash (if, for, $1), свои .service в systemd, ключи SSH + rsync и изоляция ulimit/cgroups/Docker.",
      levels: [12, 13, 14, 15, 16, 17]
    },
    {
      id: "q_net",
      num: 4,
      icon: "🌐",
      lpicBadge: "LPIC-1 • 109–110 (Full Networking)",
      title: "Квест 4: Сети с Нуля до Профи и Защита Периметра",
      subtitle: "Медь vs оптика SFP+, свитч vs роутер, модель OSI, ARP, маски CIDR в уме, IPv6, TCP/UDP, DHCP, DNS (dig), диагностика HTTP (curl/tcpdump), VLAN 802.1Q, NAT и фаервол iptables/ufw/fail2ban.",
      levels: [18, 19, 20, 21, 22, 23]
    }
  ],

  roadmapStages: [
    {
      id: "rm_hw",
      title: "Этап 1 • Аппаратный Фундамент и Хранилища Данных (Hardware + roadmap.sh Storage)",
      badge: "Уровни 0–4",
      nodes: [
        { level: 0, tag: "Hardware Core", name: "CPU, Кэш L1–L3, Двухканал RAM и Swap", topics: "lscpu, free -h, /proc/cpuinfo, /proc/meminfo, слоты A2+B2" },
        { level: 1, tag: "PCIe & Kernel", name: "Питание (PSU/Online UPS), PCIe и Драйверы", topics: "lspci -k, lsusb, lsmod, modprobe, NVMe x4 vs SATA" },
        { level: 2, tag: "Filesystems", name: "Диски, GPT vs MBR, Inodes и /etc/fstab", topics: "lsblk, blkid, df -h, df -i, mount, 6 полей /etc/fstab" },
        { level: 3, tag: "roadmap.sh: LVM", name: "Резиновые диски LVM (PV→VG→LV) и du", topics: "du -sh, pvs, vgs, lvs, lvextend -r, swapon --show" },
        { level: 4, tag: "Boot & RAID", name: "Цепочка UEFI → GRUB2 → Kernel → systemd и RAID", topics: "uname -r, dmesg, /proc/cmdline, RAID 0/1/5/10" }
      ]
    },
    {
      id: "rm_cli",
      title: "Этап 2 • Навигация, Потоки и Обработка Текста (roadmap.sh CLI & Text Processing)",
      badge: "Уровни 5–8",
      nodes: [
        { level: 5, tag: "roadmap.sh: Navigation", name: "Навигация в CLI, $PATH, which и чтение man", topics: "pwd, cd, mkdir -p, cp, mv, which, man 1/5/8, ./script.sh" },
        { level: 6, tag: "roadmap.sh: Streams", name: "Иерархия FHS и Потоки 0/1/2 (|, >, >>, 2>&1, tee)", topics: "/etc, /var, /proc, stdin/stdout/stderr, /dev/null, tee" },
        { level: 7, tag: "roadmap.sh: Archives", name: "Архивы tar, Поиск find и Регулярки grep", topics: "tar -czvf/-xzvf, find, head, tail -f, wc -l, grep -E ^/$" },
        { level: 8, tag: "roadmap.sh: Text Tools", name: "Текстовые Комбайны: cut, sort, uniq, sed, awk", topics: "cut -d: -f1, sort | uniq -c, tr, sed -i, awk '{print $1}'" }
      ]
    },
    {
      id: "rm_sys",
      title: "Этап 3 • Пакеты, Процессы, Права и Пользователи (roadmap.sh System Management)",
      badge: "Уровни 9–12",
      nodes: [
        { level: 9, tag: "roadmap.sh: Packages", name: "Пакетные Менеджеры: apt/dpkg и dnf/rpm", topics: "apt update/install, dpkg -l/-L/-S, dnf, rpm -qa/-qf" },
        { level: 10, tag: "roadmap.sh: Processes", name: "Процессы, Load Average, kill, nice и nohup", topics: "uptime, ps aux, top, SIGTERM(15) vs SIGKILL(9), renice, nohup &" },
        { level: 11, tag: "roadmap.sh: Permissions", name: "Права chmod, chown, umask, SUID/Sticky и ln -s", topics: "755/750/644/600, umask 0022, Sticky Bit /tmp, Hard vs Soft link" },
        { level: 12, tag: "roadmap.sh: Users", name: "Аккаунты, /etc/shadow и Привилегии sudo", topics: "UID 0/1000+, useradd -m, usermod -aG sudo, visudo" }
      ]
    },
    {
      id: "rm_auto",
      title: "Этап 4 • Shell-Скриптинг, Службы, SSH и Контейнеры (roadmap.sh Automation & Containers)",
      badge: "Уровни 13–17",
      nodes: [
        { level: 13, tag: "roadmap.sh: Env & Cron", name: "Переменные окружения (env/export) и Автопилот cron", topics: "export, ~/.bashrc, $?, &&, crontab (5 звёздочек), at" },
        { level: 14, tag: "roadmap.sh: Scripting", name: "Программирование на Bash: $1, if [ -f ] и циклы for", topics: "#!/bin/bash, $1..$#, if/else, флаги -f/-d/-eq, for, $(cmd)" },
        { level: 15, tag: "roadmap.sh: Systemd", name: "Службы systemd (.service), journalctl и время NTP", topics: "systemctl start/enable, свои юниты, journalctl -u, timedatectl" },
        { level: 16, tag: "roadmap.sh: SSH & Sync", name: "Защита SSH (ed25519) и Синхронизация scp / rsync", topics: "sshd_config, PermitRootLogin no, ssh-keygen, rsync -avz" },
        { level: 17, tag: "roadmap.sh: Containers", name: "Лимиты ulimit, AppArmor/SELinux и Docker изнутри", topics: "ulimit -n, /etc/security/limits.conf, Namespaces + cgroups" }
      ]
    },
    {
      id: "rm_net",
      title: "Этап 5 • Сетевая Инженерия и Киберзащита Периметра (roadmap.sh Networking & Firewalls)",
      badge: "Уровни 18–23",
      nodes: [
        { level: 18, tag: "Layer 1 & 2", name: "Физика Сети: Витая пара vs Оптика SFP+, MAC и Свитч", topics: "Биты vs Байты, 4 vs 8 жил (ethtool), Switch L2 vs Router L3" },
        { level: 19, tag: "Layer 3 & CIDR", name: "Модель OSI, ARP, Маски /24../30 в уме и IPv6", topics: "ip a, ip r, ip neigh, ping, формула 2^(32-N)-2, ::1" },
        { level: 20, tag: "Layer 4 & DNS", name: "TCP vs UDP, Порты LPIC, DHCP (DORA) и DNS", topics: "SYN/ACK, порты 22/53/80/123/443/5432, /etc/resolv.conf, dig, ss -tulnp" },
        { level: 21, tag: "roadmap.sh: HTTP & Capture", name: "Диагностика HTTP (curl -I, коды 200..502) и tcpdump", topics: "curl -I, 301/403/404/502 Bad Gateway, tcpdump -i eth0" },
        { level: 22, tag: "VLAN & NAT", name: "VLAN (802.1Q Access/Trunk), RFC 1918, NAT и traceroute", topics: "Сегментация сети, SNAT/DNAT, серые IP, прыжки TTL traceroute" },
        { level: 23, tag: "roadmap.sh: Netfilter", name: "Босс: Netfilter (iptables), ufw и Защита fail2ban", topics: "Цепочки INPUT/FORWARD/OUTPUT, DROP vs ACCEPT, ufw, fail2ban" }
      ]
    }
  ],

  chars: {
    batya: { name: "Батя Торвальдс • Инженер Железа и Ядра", ava: "🧔", cls: "batya" },
    kira:  { name: "Кира Пакет • Сетевой Архитектор", ava: "🦊", cls: "kira" },
    diego: { name: "Диего-Рут • Автовалидатор Задач", ava: "🦾", cls: "diego" },
    smith: { name: "Агент Смит • Взломщик LPIC English", ava: "🕶️", cls: "smith" }
  },

  achievements: [
    { id: "ach_first", icon: "⚡", title: "Первый Root", desc: "Реши свою первую задачу в WebLab" },
    { id: "ach_hw", icon: "🔩", title: "Повелитель Кремния", desc: "Закрой все задачи Квеста 1 (Железо, LVM и База CLI)" },
    { id: "ach_linux", icon: "🐧", title: "Ниндзя Консоли", desc: "Закрой все задачи Квеста 2 (Потоки, Текст и Процессы)" },
    { id: "ach_admin", icon: "🛡️", title: "Хранитель Серверов", desc: "Закрой все задачи Квеста 3 (Bash, Systemd и Контейнеры)" },
    { id: "ach_net", icon: "🌐", title: "Властелин Пакетов", desc: "Закрой все задачи Квеста 4 (Сети и Фаерволы)" },
    { id: "ach_vocab25", icon: "🇬🇧", title: "Взломщик Английского", desc: "Набери 25 верных ответов в тренажёре слов LPIC" },
    { id: "ach_exam", icon: "🎓", title: "Сертифицирован LPIC-1", desc: "Сдай пробный экзамен LPIC-1 на 500+ баллов из 800" }
  ],

  cheatsheets: [
    {
      id: "cs_hw",
      title: "🔩 1. Железо, Диски, LVM и Загрузка (Уровни 0–4)",
      items: [
        { cmd: "lscpu / free -h", desc: "Ядра, потоки, кэш L1–L3 процессора и объём RAM / Swap" },
        { cmd: "lspci -k / lsusb / lsmod", desc: "Шина PCIe с активными драйверами ядра, шина USB и список модулей" },
        { cmd: "modprobe <mod> / modprobe -r", desc: "Загрузить модуль ядра со всеми зависимостями / выгрузить модуль" },
        { cmd: "lsblk / blkid", desc: "Дерево блочных дисков и разделов / узнать UUID для /etc/fstab" },
        { cmd: "df -h / df -i / du -sh /var/*", desc: "Свободные гигабайты / свободные inodes / вес конкретных папок" },
        { cmd: "pvs / vgs / lvs", desc: "Три этажа LVM: физические диски (PV) → пул (VG) → логические тома (LV)" },
        { cmd: "lvextend -r -L +20G /dev/vg/lv", desc: "Расширить том LVM на 20 ГБ прямо на лету вместе с файловой системой (-r)" },
        { cmd: "uname -r / dmesg / /proc/cmdline", desc: "Версия ядра, лог инициализации оборудования и параметры от GRUB2" },
        { cmd: "RAID 0 / 1 / 5 / 10", desc: "0 = скорость (0 защиты), 1 = зеркало (2 диска), 5 = чётность (3+ диска), 10 = зеркало+скорость (4+ диска)" }
      ]
    },
    {
      id: "cs_cli",
      title: "🐧 2. Навигация, Потоки и Обработка Текста (Уровни 5–8)",
      items: [
        { cmd: "pwd / cd .. / cd ~ / cd -", desc: "Текущая папка / на уровень выше / домой / в предыдущую папку" },
        { cmd: "which <cmd> / man 1 / man 5 / man 8", desc: "Путь к бинарнику в $PATH / справка: 1=команды, 5=конфиги, 8=админка" },
        { cmd: "mkdir -p a/b/c / cp -r / mv", desc: "Создать цепочку вложенных папок / копировать рекурсивно / переместить" },
        { cmd: "| , > , >> , 2>/dev/null , 2>&1 , tee", desc: "Пайп, перезапись, дозапись, скрыть ошибки stderr, слить потоки, запись+экран" },
        { cmd: "tar -czvf a.tar.gz dir/ (-xzvf)", desc: "Создать (-c) или распаковать (-x) сжатый gzip (-z) архив" },
        { cmd: "find /var -name '*.log' -size +50M", desc: "Найти файлы по маске имени, размеру и времени изменения (-mtime)" },
        { cmd: "cut -d: -f1 /etc/passwd", desc: "Вырезать 1-й столбец (-f1), используя двоеточие как разделитель (-d:)" },
        { cmd: "awk '{print $1}' log | sort | uniq -c", desc: "Вытащить 1-ю колонку и посчитать количество уникальных повторений" },
        { cmd: "sed -i 's/old/new/g' config.conf", desc: "Заменить текст прямо внутри файла без открытия редактора" }
      ]
    },
    {
      id: "cs_sys",
      title: "⚙️ 3. Пакеты, Процессы, Права и Юзеры (Уровни 9–12)",
      items: [
        { cmd: "apt update && apt install <pkg>", desc: "Обновить индекс репозиториев и установить пакет (Debian/Ubuntu)" },
        { cmd: "dpkg -l / dpkg -L <pkg> / dpkg -S <path>", desc: "Список .deb пакетов / файлы пакета / какому пакету принадлежит файл" },
        { cmd: "dnf install / rpm -qa / rpm -qf <path>", desc: "Аналоги в мире Red Hat / Rocky / AlmaLinux / Fedora" },
        { cmd: "uptime / ps aux / top", desc: "Load Average за 1, 5, 15 мин и список процессов с расходом CPU/RAM" },
        { cmd: "kill <PID> (15) vs kill -9 <PID>", desc: "SIGTERM (15, мягкое завершение по умолчанию) vs SIGKILL (9, мгновенное убийство)" },
        { cmd: "nice -n 10 / renice -n 15 -p PID / nohup cmd &", desc: "Приоритеты (-20 высший .. +19 низший) и фоновый запуск без обрыва по SSH" },
        { cmd: "chmod 600 / 644 / 750 / 755 / 1777", desc: "r=4, w=2, x=1; 1777 = Sticky Bit на /tmp; ln -s = символическая ссылка" },
        { cmd: "useradd -m -s /bin/bash u && usermod -aG sudo u", desc: "Создать юзера с /home и добавить в группу sudo, НЕ затирая старые группы (-a!)" }
      ]
    },
    {
      id: "cs_auto",
      title: "🤖 4. Bash-Скрипты, Systemd, SSH и Контейнеры (Уровни 13–17)",
      items: [
        { cmd: "export KEY=val / echo $? / cmd1 && cmd2", desc: "Переменная окружения / код возврата (0 = успех) / запуск при успехе" },
        { cmd: "MIN HOUR DOM MON DOW command", desc: "5 полей crontab: 0 3 * * * = каждую ночь в 03:00; 15 4 * * 1 = пн в 04:15" },
        { cmd: "#!/bin/bash , $1..$# , if [ -f \"$1\" ]; then", desc: "Шебанг, аргументы запуска, проверка файла (-f) или папки (-d)" },
        { cmd: "systemctl start / enable --now / status svc", desc: "Запустить сейчас / включить в автозагрузку и запустить / проверить статус" },
        { cmd: "journalctl -u nginx -n 50 / timedatectl", desc: "Логи конкретной службы systemd / проверка точного времени и NTP" },
        { cmd: "ssh-keygen -t ed25519 / rsync -avz src dst", desc: "Генерация современных SSH-ключей и быстрая дельта-синхронизация папок" },
        { cmd: "ulimit -n 65535 / Namespaces + cgroups", desc: "Лимит открытых файлов (Too many open files) и два кита Docker-контейнеров" }
      ]
    },
    {
      id: "cs_net",
      title: "🌐 5. Сети, Маски CIDR, DNS, HTTP и Фаервол (Уровни 18–23)",
      items: [
        { cmd: "ethtool eth0 / ip link / ip neigh", desc: "Проверка скорости кабеля (100 vs 1000Mb/s), MAC-адреса и таблицы ARP" },
        { cmd: "ip addr add IP/24 dev eth0 / ip route", desc: "Назначить IPv4 адрес и проверить/добавить маршрут default via GW" },
        { cmd: "Формула хостов: 2^(32 - префикс) - 2", desc: "/24=254, /25=126, /26=62, /27=30, /28=14, /29=6, /30=2 хоста; IPv6 Loopback = ::1" },
        { cmd: "ss -tulnp / dig domain / /etc/resolv.conf", desc: "Открытые порты и PID процессов / проверка DNS / файл DNS-серверов" },
        { cmd: "curl -I url / tcpdump -i eth0 port 80", desc: "Проверка HTTP-кодов (200, 301, 403, 404, 502) и живой перехват пакетов" },
        { cmd: "RFC 1918 (Серые IP) & VLAN 802.1Q", desc: "10.0.0.0/8, 172.16.0.0/12 (16..31), 192.168.0.0/16; Access vs Trunk порт" },
        { cmd: "ufw allow 22/tcp / iptables -A INPUT -s IP -j DROP", desc: "Правила фаервола (цепочки INPUT, OUTPUT, FORWARD) и бан атакующих" }
      ]
    }
  ],

  xrayDict: {
    which: ["уи́ч", "какой / какая / который", "Главное вопросительное слово 80% задач LPIC!"],
    what: ["уо́т", "что / какой", "What does this command do = Что делает эта команда"],
    where: ["уэ́а", "где / куда", "Where are logs stored = Где хранятся логи"],
    how: ["ха́у", "как / сколько", "How many = сколько"],
    many: ["мэ́ни", "много (How many = сколько)", ""],
    following: ["фо́ллоуинг", "следующий / нижеперечисленный", "Which of the following = Какой из перечисленных ниже..."],
    command: ["комма́нд", "команда / утилита", "Консольная программа в терминале"],
    commands: ["комма́ндс", "команды", ""],
    option: ["о́пшн", "ключ / флаг команды", "Например -h, -l, -r"],
    options: ["о́пшнс", "ключи / флаги", ""],
    displays: ["дисплэ́йс", "отображает / выводит на экран", "Синонимы на экзамене: shows, prints, lists"],
    shows: ["шо́уз", "показывает", ""],
    prints: ["при́нтс", "выводит в консоль", "В консоли print — вывод текста на экран"],
    lists: ["ли́стс", "выводит списком", "Отсюда команда ls = list"],
    detailed: ["дитэ́йлд", "подробный / детальный", "Намекает на флаг -v (verbose) или -l (long)"],
    information: ["информэ́йшн", "информация / сведения", ""],
    about: ["эба́ут", "о / про", ""],
    all: ["ол", "все / всё", "Часто флаг -a (all)"],
    buses: ["ба́сез", "шины (передачи данных)", "PCI bus, USB bus"],
    devices: ["дева́йсез", "устройства", ""],
    device: ["дева́йс", "устройство", "Файлы устройств живут в /dev"],
    connected: ["конне́ктед", "подключённые", ""],
    currently: ["ка́ррентли", "в данный момент / сейчас", ""],
    running: ["ра́ннинг", "работающий / запущенный", ""],
    system: ["си́стем", "система", ""],
    file: ["файл", "файл", "В Linux всё есть файл!"],
    files: ["файлз", "файлы", ""],
    directory: ["дире́ктори", "папка / каталог", "mkdir = make directory"],
    directories: ["дире́кториз", "папки / каталоги", ""],
    path: ["пас", "путь к файлу", "Full path = полный путь от корня /"],
    full: ["фул", "полный", "Full path начинается с /"],
    specify: ["спе́сифай", "указать / вписать", "Specify ONLY the command name = впиши только имя команды"],
    only: ["о́унли", "только", ""],
    without: ["уиза́ут", "без", "Without options = без флагов и аргументов!"],
    contains: ["контэ́йнс", "содержит в себе", ""],
    stores: ["сторз", "хранит", ""],
    defines: ["дефа́йнс", "определяет / задаёт", ""],
    memory: ["ме́мори", "оперативная память (RAM)", "/proc/meminfo и free -h"],
    usage: ["ю́зедж", "использование / расход", "Disk usage = команда du!"],
    swap: ["своп", "раздел подкачки на диске", ""],
    space: ["спэйс", "пространство / свободное место", "Disk free space = df!"],
    administrator: ["администрэ́йтор", "системный администратор", ""],
    overview: ["о́вервью", "обзор / сводка", ""],
    available: ["эвэ́йлэбл", "доступные / свободные", ""],
    block: ["блок", "блочный", "Block device -> lsblk"],
    partitions: ["парти́шнс", "разделы диска", "nvme0n1p1, sda1"],
    partition: ["парти́шн", "раздел диска", ""],
    mount: ["ма́унт", "монтирование (подключение диска к папке)", ""],
    mounted: ["ма́унтед", "смонтированный", ""],
    points: ["по́интс", "точки (mount points)", ""],
    tree: ["три", "дерево", "lsblk выводит дерево дисков"],
    kernel: ["кёрнел", "ядро Linux", ""],
    module: ["мо́дьюл", "модуль ядра (драйвер)", "lsmod, modprobe"],
    modules: ["мо́дьюлс", "модули ядра (драйверы)", ""],
    loaded: ["ло́удед", "загруженные в память", "lsmod"],
    loads: ["ло́удз", "загружает", "modprobe loads module with dependencies"],
    dependencies: ["депе́нденсиз", "зависимости", ""],
    parameters: ["пара́метерс", "параметры / аргументы", "/proc/cmdline"],
    passed: ["пасст", "переданные", ""],
    boot: ["бут", "загрузка ОС", "GRUB2 bootloader"],
    time: ["тайм", "время / момент", ""],
    power: ["па́уэр", "питание", "PSU = Power Supply Unit"],
    supply: ["сапла́й", "источник / подача", ""],
    outage: ["а́утэйдж", "отключение электричества", "Спасает Online UPS"],
    redundancy: ["реда́нденси", "отказоустойчивость / резервирование", "RAID 1/5/10 и 2x PSU"],
    striping: ["стра́йпинг", "чередование блоков (RAID 0)", ""],
    mirroring: ["ми́рроринг", "зеркалирование (RAID 1)", ""],
    parity: ["пэ́рити", "чётность (контрольные суммы в RAID 5)", "Минимум 3 диска"],
    filesystem: ["фа́йлсистем", "файловая система", "ext4, xfs, vfat"],
    filesystems: ["фа́йлсистемс", "файловые системы", ""],
    inodes: ["а́й-ноудз", "индексные дескрипторы (паспорта файлов)", "Проверяются через df -i"],
    uuid: ["ю-ю-ай-ди́", "уникальный ID раздела", "Узнаётся через blkid"],
    standard: ["ста́ндарт", "стандартный", "stdin(0), stdout(1), stderr(2)"],
    output: ["а́утпут", "вывод (stdout = 1)", ""],
    input: ["и́нпут", "ввод (stdin = 0) или цепочка INPUT", ""],
    error: ["э́ррор", "ошибка (stderr = 2)", "2>/dev/null"],
    sends: ["сендс", "отправляет / направляет", ""],
    another: ["эна́зер", "другой / следующая", ""],
    operator: ["оперэ́йтор", "оператор", "|, >, >>, &&"],
    appends: ["аппе́ндс", "дописывает в конец файла (>>)", "Не стирает старое содержимое!"],
    overwrites: ["оверра́йтс", "перезаписывает поверх (>)", "Стирает старый файл!"],
    permissions: ["перми́шнс", "права доступа (rwx)", "chmod"],
    sets: ["сетс", "устанавливает / задаёт", ""],
    owner: ["о́унер", "владелец файла", "chown"],
    ownership: ["о́унершип", "принадлежность (владелец:группа)", ""],
    group: ["груп", "группа пользователей", ""],
    groups: ["групс", "группы пользователей", ""],
    others: ["а́зерс", "все остальные (3-я цифра в chmod)", ""],
    read: ["рид", "чтение (r = 4)", ""],
    write: ["райт", "запись (w = 2)", ""],
    execute: ["э́кзекьют", "выполнение / вход в папку (x = 1)", ""],
    symbolic: ["симбо́лик", "символическая ссылка (ln -s)", ""],
    link: ["линк", "ссылка или сетевой линк", ""],
    package: ["пэ́кидж", "пакет программы (.deb / .rpm)", ""],
    packages: ["пэ́киджес", "пакеты программ", ""],
    installed: ["инсто́лд", "установленные", ""],
    install: ["инсто́л", "установить", ""],
    updates: ["апдэ́йтс", "обновляет", ""],
    repository: ["репо́зитори", "репозиторий пакетов", ""],
    process: ["про́сесс", "процесс в памяти (PID)", ""],
    processes: ["про́сессез", "процессы", ""],
    signal: ["си́гнал", "сигнал процессу", "15=SIGTERM, 9=SIGKILL, 1=SIGHUP"],
    terminate: ["тёрминэйт", "завершить процесс", "SIGTERM (15)"],
    immediately: ["имми́диэтли", "немедленно / мгновенно", "SIGKILL (-9)"],
    archive: ["а́ркайв", "архив (tar)", ""],
    compressed: ["компре́сст", "сжатый (gzip -z)", ""],
    extracts: ["экстрэ́ктс", "распаковывает (tar -x)", ""],
    creates: ["криэ́йтс", "создаёт (tar -c / mkdir)", ""],
    creating: ["криэ́йтинг", "создание", ""],
    lines: ["лайнз", "строки текста", "wc -l"],
    line: ["лайн", "строка", ""],
    matching: ["мэ́тчинг", "совпадающие с шаблоном", "grep"],
    pattern: ["па́ттерн", "шаблон поиска / регулярка", ""],
    user: ["ю́зер", "пользователь", ""],
    account: ["акка́унт", "учётная запись", ""],
    home: ["хо́ум", "домашний каталог (/home/имя)", "useradd -m"],
    encrypted: ["энкри́птед", "захэшированный / зашифрованный", "/etc/shadow"],
    passwords: ["па́ссуордз", "пароли", ""],
    schedule: ["ске́дьюл", "расписание (cron)", ""],
    recurring: ["рика́рринг", "регулярные / повторяющиеся", "cron"],
    job: ["джоб", "задание (cron / фоновая задача)", ""],
    minute: ["ми́нит", "минута", ""],
    hour: ["а́уэр", "час", ""],
    day: ["дэй", "день", ""],
    every: ["э́ври", "каждый (*)", ""],
    variable: ["вэ́риэбл", "переменная ($PATH, $?)", ""],
    exit: ["э́кзит", "выход / код возврата ($?)", "0 = без ошибок"],
    status: ["стэ́йтус", "статус / состояние", ""],
    previous: ["при́виус", "предыдущий", ""],
    service: ["сё́рвис", "системная служба (.service)", ""],
    daemon: ["ди́мон", "фоновая служба (sshd, nginx)", ""],
    enables: ["энэ́йблз", "включает автозапуск (systemctl enable)", ""],
    starts: ["стартс", "запускает сейчас (systemctl start)", ""],
    automatically: ["отома́тикалли", "автоматически", ""],
    journal: ["джё́рнал", "системный журнал (journalctl)", ""],
    remote: ["римо́ут", "удалённый (по сети)", "SSH, rsync, scp"],
    root: ["рут", "суперпользователь UID 0 или корень /", ""],
    login: ["ло́гин", "вход в систему", "PermitRootLogin no"],
    disable: ["дизэ́йбл", "отключить / запретить", ""],
    hardware: ["ха́рд-вэа", "железо / аппаратный (MAC)", ""],
    address: ["а́дресс", "адрес (IP или MAC)", ""],
    layer: ["лэ́йер", "уровень модели OSI", "L1, L2, L3, L4, L7"],
    frames: ["фрэймс", "кадры (единица данных на L2 у свитча)", ""],
    packets: ["пэ́кетс", "пакеты (единица данных на L3 у роутера)", ""],
    local: ["ло́кал", "локальный", ""],
    network: ["не́творк", "сеть", ""],
    adds: ["эддс", "добавляет", ""],
    default: ["дефо́лт", "по умолчанию", "Default gateway"],
    gateway: ["гэ́йтвэй", "шлюз (выход в другие сети)", ""],
    interface: ["интерфэ́йс", "сетевой интерфейс (eth0, lo)", ""],
    usable: ["ю́зэбл", "рабочие адреса хостов (−2)", "2^(32-префикс) - 2"],
    hosts: ["хостс", "узлы / компьютеры", "/etc/hosts"],
    subnet: ["са́бнет", "подсеть", ""],
    mask: ["маск", "маска подсети", ""],
    configuration: ["конфигюрэ́йшн", "конфигурация (/etc)", ""],
    edit: ["э́дит", "редактировать", ""],
    servers: ["сё́рверс", "серверы", ""],
    server: ["сё́рвер", "сервер", ""],
    hostname: ["хо́стнэйм", "имя хоста / домен", ""],
    resolution: ["резолю́шн", "разрешение имён (DNS)", ""],
    port: ["порт", "порт TCP/UDP", ""],
    ports: ["портс", "порты TCP/UDP", ""],
    listening: ["ли́сенинг", "ожидающий подключений (-l)", "ss -tulnp"],
    sockets: ["со́кетс", "сокеты (IP + порт)", "ss = Socket Statistics"],
    private: ["пра́йвет", "частный / «серый» IP (RFC 1918)", "10.x, 172.16..31.x, 192.168.x"],
    public: ["па́блик", "публичный / открытый", ""],
    route: ["рут / раут", "маршрут пакетов", "ip route, traceroute"],
    firewall: ["фа́йервол", "межсетевой экран", "iptables, ufw"],
    incoming: ["инка́минг", "входящий трафик", "INPUT / ufw default deny incoming"],
    shell: ["шелл", "командная оболочка (/bin/bash)", ""],
    append: ["аппе́нд", "добавить в конец (-aG / >>)", ""],
    supplementary: ["саплиме́нтари", "дополнительные группы", "usermod -aG"],
    existing: ["экзи́стинг", "существующий", ""],
    script: ["скрипт", "сценарий Bash", ""],
    first: ["фёрст", "первый", ""],
    interpreter: ["интёрпретер", "интерпретатор (#!/bin/bash)", ""],
    runs: ["ранз", "запускается / выполняет", ""],
    daily: ["дэ́йли", "ежедневно", ""],
    reboot: ["рибу́т", "перезагрузка", ""],
    messages: ["ме́сседжес", "сообщения логов", ""],
    unit: ["ю́нит", "юнит systemd (-u)", ""],
    clock: ["клок", "системные часы", "timedatectl"],
    synchronization: ["синкронайзэ́йшн", "синхронизация (NTP / rsync)", ""],
    allow: ["эла́у", "разрешить", ""],
    deny: ["дина́й", "запретить", ""],
    prevent: ["приве́нт", "предотвратить / запретить", ""],
    prevents: ["приве́нтс", "предотвращает / запрещает", "PermitRootLogin no"],
    direct: ["дайре́кт", "прямой", ""],
    protocol: ["про́токол", "сетевой протокол", ""],
    connectionless: ["конне́кшн-лесс", "без установки соединения (UDP)", ""],
    reliable: ["рила́йэбл", "надёжный с подтверждением (TCP)", ""],
    loopback: ["лу́пбэк", "петля на себя (127.0.0.1 и ::1)", ""],
    ranges: ["рэ́йнджес", "диапазоны адресов", ""],
    reserved: ["ризё́рвд", "зарезервированный", ""],
    hop: ["хоп", "прыжок через роутер (TTL)", "traceroute"],
    hops: ["хопс", "прыжки через роутеры", ""],
    destination: ["дестинэ́йшн", "пункт назначения", ""],
    logical: ["ло́джикал", "логический (том LVM — LV)", "lvextend, lvs"],
    volume: ["во́льюм", "том диска (PV / VG / LV)", "LVM = Logical Volume Manager"],
    priority: ["прайо́рити", "приоритет планировщика (nice)", "-20 = высший, +19 = низший"],
    background: ["бэ́кграунд", "фоновый режим (&, nohup)", ""],
    delimiter: ["дели́митер", "символ-разделитель колонок (-d)", "cut -d: -f1"],
    duplicate: ["дью́пликэйт", "дублирующиеся (повторяющиеся) строки", "uniq убирает соседние дубликаты"],
    headers: ["хе́дерс", "HTTP-заголовки ответа", "curl -I выводит headers"],
    chain: ["чэйн", "цепочка правил фаервола", "INPUT, OUTPUT, FORWARD в iptables"],
    gathers: ["гэ́зерс", "собирает сведения", "lscpu gathers CPU architecture info"],
    summarizes: ["са́ммарайзиз", "суммирует / сводит итог (-s)", "du -sh summarizes directory disk usage"],
    type: ["тайп", "тип (файловой системы или команды)", "vfat, ext4, xfs / type cmd"],
    required: ["риква́йерд", "требуемый / обязательный", "required by UEFI ESP"],
    vfat: ["ви-фат", "файловая система FAT32 в Linux", "обязательна для раздела EFI (/boot/efi)"],
    fat32: ["фат-32", "файловая система FAT32 (vfat)", "стандарт раздела UEFI ESP"],
    current: ["ка́ррент", "текущий", "current working directory (pwd)"],
    working: ["во́ркинг", "рабочий (каталог)", "pwd = print working directory"],
    architecture: ["а́ркитекче", "архитектура процессора (x86_64, ARM)", "lscpu"],
    including: ["инклу́динг", "включая / в том числе", ""],
    number: ["на́мбер", "количество / число", "Number of cores = количество ядер"],
    cores: ["корз", "ядра процессора", "CPU cores"],
    caches: ["кэ́шез", "кэш-память процессора (L1, L2, L3)", "lscpu"],
    arguments: ["а́ргьюментс", "аргументы командной строки", "$1, $2, /proc/cmdline"],
    used: ["юзд", "используется / применённый", "is used to = используется для..."],
    load: ["ло́уд", "загрузить (модуль) или нагрузка (Load)", "modprobe, Load Average"],
    together: ["туге́зер", "вместе / совместно", "together with dependencies"],
    dependent: ["депе́ндент", "зависимый", "dependent modules = зависимые модули"],
    name: ["нэйм", "имя / название", "find -name, hostname"],
    halting: ["хо́лтинг", "аварийная остановка системы", "nofail спасает от halting при загрузке"],
    dropping: ["дро́ппинг", "сброс / падение в аварийный режим", "dropping into emergency mode"],
    into: ["и́нту", "в / внутрь", ""],
    emergency: ["имё́рдженси", "аварийный / экстренный", "emergency mode при ошибке в /etc/fstab"],
    mode: ["мо́уд", "режим работы", "emergency mode, Enforcing / Permissive mode"],
    missing: ["ми́ссинг", "отсутствующий / отключённый", "missing disk = пропавший диск"],
    during: ["дью́ринг", "во время / в процессе", "during boot = во время загрузки"],
    initialize: ["ини́шиэлайз", "инициализировать / разметить с нуля", "pvcreate initializes Physical Volume"],
    physical: ["фи́зикал", "физический", "PV = Physical Volume в LVM"],
    configures: ["конфи́гьюрз", "настраивает / конфигурирует", ""],
    array: ["эррэ́й", "дисковый массив (RAID array)", "RAID 0/1/5/10"],
    using: ["ю́зинг", "используя / с помощью", ""],
    disks: ["дискс", "диски / накопители", ""],
    each: ["ич", "каждый (по отдельности)", "4 disks of 2 TB each"],
    capacity: ["кэпэ́сити", "ёмкость / полезный объём", "Usable capacity в RAID"],
    disk: ["диск", "диск / накопитель", ""],
    failures: ["фэ́йльерс", "отказы / поломки дисков", "disk failures = выход дисков из строя"],
    tolerate: ["то́лерэйт", "выдержать / пережить без потери данных", "fault tolerance = отказоустойчивость"],
    data: ["дэ́йта", "данные", "without data loss = без потери данных"],
    loss: ["лосс", "потеря (data loss / packet loss)", ""],
    invert: ["инвё́рт", "инвертировать (вывести строки БЕЗ шаблона)", "grep -v (--invert-match)"],
    match: ["мэтч", "совпадение с шаблоном", "grep, iptables match"]
  },

  // 30 LPIC-1 & roadmap.sh Exam Questions (100% covered in Levels 0–23!)
  examBank: [
    {
      id: "ex1", exam: "101", kind: "mc",
      q: "<w k='which'>Which</w> <w k='file'>file</w> in `/proc` <w k='contains'>contains</w> <w k='information'>information</w> <w k='about'>about</w> the processor cores, cache size, and flags?",
      opts: ["/proc/cpuinfo", "/proc/meminfo", "/etc/cpu.conf", "/dev/cpu0"],
      ans: 0,
      exp: "`/proc/cpuinfo` (Уровень 0) хранит живую сводку ядра о каждом ядре процессора, кэше L1–L3 и флагах."
    },
    {
      id: "ex2", exam: "101", kind: "mc",
      q: "<w k='which'>Which</w> `lspci` <w k='option'>option</w> <w k='displays'>displays</w> the Linux <w k='kernel'>kernel</w> drivers handling each PCI <w k='device'>device</w>?",
      opts: ["lspci -k", "lspci -u", "lspci -m", "lspci -d"],
      ans: 0,
      exp: "Флаг `-k` (kernel, Уровень 1) в `lspci -k` показывает активный драйвер ядра (`Kernel driver in use`) для каждого PCIe-устройства."
    },
    {
      id: "ex3", exam: "101", kind: "fill",
      q: "<w k='which'>Which</w> <w k='command'>command</w> (<w k='without'>without</w> <w k='options'>options</w>) <w k='lists'>lists</w> <w k='all'>all</w> <w k='currently'>currently</w> <w k='loaded'>loaded</w> Linux <w k='kernel'>kernel</w> <w k='modules'>modules</w>?",
      accepted: ["lsmod"],
      exp: "`lsmod` (Уровень 1 — list modules) выводит список загруженных в память ядра драйверов/модулей."
    },
    {
      id: "ex4", exam: "101", kind: "fill",
      q: "<w k='which'>Which</w> <w k='file'>file</w> (<w k='specify'>specify</w> the <w k='full'>full</w> <w k='path'>path</w>) <w k='defines'>defines</w> <w k='filesystems'>filesystems</w> <w k='mounted'>mounted</w> <w k='automatically'>automatically</w> at <w k='boot'>boot</w> <w k='time'>time</w>?",
      accepted: ["/etc/fstab"],
      exp: "`/etc/fstab` (Уровень 2 — File System Table) задаёт все 6 колонок постоянного монтирования разделов по `UUID=`."
    },
    {
      id: "ex5", exam: "101", kind: "mc",
      q: "A <w k='server'>server</w> has <w k='space'>space</w> left in `df -h`, yet cannot create new <w k='files'>files</w>. <w k='which'>Which</w> <w k='command'>command</w> checks <w k='available'>available</w> <w k='inodes'>inodes</w>?",
      opts: ["df -i", "du -i", "lsblk -f", "fdisk -l"],
      ans: 0,
      exp: "`df -i` (Уровень 2) показывает расход индексных дескрипторов (`inodes`), которые кончаются при миллионах мелких файлов."
    },
    {
      id: "ex6", exam: "101", kind: "mc",
      q: "<w k='which'>Which</w> <w k='command'>command</w> extends an LVM <w k='logical'>logical</w> <w k='volume'>volume</w> AND resizes its <w k='filesystem'>filesystem</w> on the fly?",
      opts: ["pvcreate -r /dev/vg0/lv0", "lvextend -r -L +10G /dev/vg0/lv0", "vgs -r +10G", "mkswap -r /dev/vg0/lv0"],
      ans: 1,
      exp: "`lvextend -r` (Уровень 3) увеличивает логический том LVM и сразу растягивает файловую систему без размонтирования."
    },
    {
      id: "ex7", exam: "101", kind: "mc",
      q: "<w k='which'>Which</w> RAID level requires at least 3 disks and uses <w k='parity'>parity</w> so the array survives the failure of any single disk?",
      opts: ["RAID 0", "RAID 1", "RAID 5", "JBOD"],
      ans: 2,
      exp: "RAID 5 (Уровень 4) требует минимум 3 диска, распределяет блоки чётности (`parity`) и переживает смерть любого 1 диска."
    },
    {
      id: "ex8", exam: "101", kind: "fill",
      q: "<w k='which'>Which</w> <w k='command'>command</w> searches the `PATH` <w k='variable'>variable</w> and <w k='prints'>prints</w> the <w k='full'>full</w> <w k='path'>path</w> of an executable binary?",
      accepted: ["which"],
      exp: "`which` (Уровень 5) ищет исполняемый файл по каталогам из `$PATH` и показывает его точный путь (например `/usr/sbin/nginx`)."
    },
    {
      id: "ex9", exam: "101", kind: "mc",
      q: "<w k='which'>Which</w> `man` section documents configuration <w k='file'>file</w> formats (such as `/etc/fstab` and `/etc/crontab`)?",
      opts: ["Section 1", "Section 5", "Section 8", "Section 9"],
      ans: 1,
      exp: "В `man` (Уровень 5): секция `1` — команды пользователей, секция `5` — форматы конфигурационных файлов, секция `8` — утилиты сисадмина."
    },
    {
      id: "ex10", exam: "101", kind: "mc",
      q: "<w k='which'>Which</w> <w k='operator'>operator</w> redirects <w k='standard'>standard</w> <w k='error'>error</w> (`stderr`) of a <w k='command'>command</w> to `/dev/null`?",
      opts: ["1> /dev/null", "2> /dev/null", ">> /dev/null", "| /dev/null"],
      ans: 1,
      exp: "Поток ошибок `stderr` имеет дескриптор `2` (Уровень 6), поэтому пишется `2> /dev/null`."
    },
    {
      id: "ex11", exam: "101", kind: "mc",
      q: "<w k='which'>Which</w> <w k='command'>command</w> <w k='creates'>creates</w> a gzip-<w k='compressed'>compressed</w> tar <w k='archive'>archive</w> `etc.tar.gz` from `/etc`?",
      opts: ["tar -xzvf etc.tar.gz /etc", "tar -czvf etc.tar.gz /etc", "tar -tzvf etc.tar.gz /etc", "gzip -r etc.tar.gz /etc"],
      ans: 1,
      exp: "`tar -czvf` (Уровень 7): `-c` (create), `-z` (gzip), `-v` (verbose), `-f` (имя файла архива)."
    },
    {
      id: "ex12", exam: "101", kind: "mc",
      q: "<w k='which'>Which</w> pipeline extracts the 1st colon-separated field from `/etc/passwd`?",
      opts: ["cut -d: -f1 /etc/passwd", "grep -c : /etc/passwd", "wc -l /etc/passwd", "tar -f1 /etc/passwd"],
      ans: 0,
      exp: "`cut -d: -f1` (Уровень 8) задаёт разделитель `:` (`-d:`) и вырезает первое поле (`-f1` — имена пользователей)."
    },
    {
      id: "ex13", exam: "101", kind: "mc",
      q: "In `APT` on Debian/Ubuntu, <w k='which'>which</w> <w k='command'>command</w> refreshes the list of <w k='available'>available</w> <w k='packages'>packages</w> from <w k='repository'>repository</w> <w k='servers'>servers</w> <w k='without'>without</w> installing upgrades?",
      opts: ["apt upgrade", "apt update", "dpkg -i", "apt-cache policy"],
      ans: 1,
      exp: "`apt update` (Уровень 9) скачивает свежие индексы пакетов из репозиториев, не обновляя сами установленные программы."
    },
    {
      id: "ex14", exam: "101", kind: "mc",
      q: "<w k='which'>Which</w> <w k='signal'>signal</w> number terminates a hung <w k='process'>process</w> <w k='immediately'>immediately</w> (`SIGKILL`) and cannot be ignored by the <w k='process'>process</w>?",
      opts: ["1", "2", "9", "15"],
      ans: 2,
      exp: "Сигнал `9` (`SIGKILL`, Уровень 10) убивает процесс мгновенно на уровне ядра, а `15` (`SIGTERM`) — вежливый сигнал по умолчанию."
    },
    {
      id: "ex15", exam: "101", kind: "mc",
      q: "<w k='what'>What</w> octal <w k='permissions'>permissions</w> value corresponds to `-rwxr-x---`?",
      opts: ["755", "750", "640", "705"],
      ans: 1,
      exp: "Считаем по Уровню 11: `rwx` = 4+2+1 = `7`, `r-x` = 4+0+1 = `5`, `---` = `0` → получается `750`!"
    },
    {
      id: "ex16", exam: "102", kind: "fill",
      q: "<w k='which'>Which</w> <w k='file'>file</w> (<w k='full'>full</w> <w k='path'>path</w>) <w k='contains'>contains</w> <w k='encrypted'>encrypted</w> <w k='user'>user</w> <w k='passwords'>passwords</w> readable <w k='only'>only</w> by `root`?",
      accepted: ["/etc/shadow"],
      exp: "Захэшированные пароли и сроки их действия хранятся строго в `/etc/shadow` (Уровень 12)."
    },
    {
      id: "ex17", exam: "102", kind: "mc",
      q: "<w k='which'>Which</w> <w k='command'>command</w> safely edits `/etc/sudoers` and validates syntax before saving?",
      opts: ["visudo", "sudoedit-raw", "chmod +s /etc/sudoers", "passwd -s"],
      ans: 0,
      exp: "`visudo` (Уровень 12) проверяет синтаксис `/etc/sudoers` перед сохранением, спасая от поломки `sudo` на сервере."
    },
    {
      id: "ex18", exam: "102", kind: "mc",
      q: "A `crontab` <w k='line'>line</w> begins with `15 4 * * 1`. When does this <w k='job'>job</w> execute?",
      opts: ["At 04:15 every Monday", "At 15:04 on January 1st", "Every 15 minutes at 4 AM", "At 04:15 on the 1st of every month"],
      ans: 0,
      exp: "По правилу 5 звёздочек (Уровень 13): `15` минут, `4` часа, `*` день, `*` месяц, `1` Понедельник → в 04:15 каждый понедельник!"
    },
    {
      id: "ex19", exam: "102", kind: "mc",
      q: "<w k='which'>Which</w> <w k='first'>first</w> <w k='line'>line</w> (shebang) ensures a <w k='script'>script</w> is executed by the Bash <w k='interpreter'>interpreter</w>?",
      opts: ["//bin/bash", "#!/bin/bash", "!#/bin/bash", "#$/bin/bash"],
      ans: 1,
      exp: "Шебанг в Bash-скриптах (Уровень 14) всегда пишется как `#!/bin/bash`."
    },
    {
      id: "ex20", exam: "102", kind: "mc",
      q: "In a Bash <w k='script'>script</w>, <w k='which'>which</w> test checks whether `/etc/hosts` exists as a regular <w k='file'>file</w>?",
      opts: ["[ -d /etc/hosts ]", "[ -f /etc/hosts ]", "[ -z /etc/hosts ]", "[ -eq /etc/hosts ]"],
      ans: 1,
      exp: "В условиях Bash (Уровень 14): `-f` проверяет обычный файл (`file`), а `-d` проверяет папку (`directory`)."
    },
    {
      id: "ex21", exam: "102", kind: "mc",
      q: "<w k='which'>Which</w> <w k='command'>command</w> <w k='shows'>shows</w> `systemd` <w k='journal'>journal</w> log <w k='messages'>messages</w> specifically for `ssh.service`?",
      opts: ["systemctl log ssh", "journalctl -u ssh.service", "dmesg -u ssh", "cat /proc/ssh.log"],
      ans: 1,
      exp: "`journalctl -u <unit>` (Уровень 15) фильтрует системный журнал по конкретному юниту systemd."
    },
    {
      id: "ex22", exam: "102", kind: "mc",
      q: "<w k='which'>Which</w> setting in `/etc/ssh/sshd_config` <w k='prevents'>prevents</w> attackers from logging in directly as `root` over SSH?",
      opts: ["AllowRoot no", "PermitRootLogin no", "RootSSH false", "DisableRoot yes"],
      ans: 1,
      exp: "`PermitRootLogin no` (Уровень 16) блокирует прямой вход под `root` по SSH."
    },
    {
      id: "ex23", exam: "102", kind: "mc",
      q: "<w k='which'>Which</w> utility synchronizes <w k='directories'>directories</w> over SSH by transferring <w k='only'>only</w> changed delta blocks?",
      opts: ["rsync -avz", "tar -cf", "ping -c", "ulimit -n"],
      ans: 0,
      exp: "`rsync -avz` (Уровень 16) передаёт по сети только изменившиеся части файлов со сжатием."
    },
    {
      id: "ex24", exam: "102", kind: "mc",
      q: "<w k='which'>Which</w> two Linux <w k='kernel'>kernel</w> features form the foundation of Docker containers?",
      opts: ["GRUB2 and MBR", "Namespaces and cgroups", "RAID and Swap", "ARP and DHCP"],
      ans: 1,
      exp: "`Namespaces` (изоляция видимости) и `cgroups` (лимиты CPU/RAM) — два механизма ядра Linux, на которых работают контейнеры (Уровень 17)."
    },
    {
      id: "ex25", exam: "102", kind: "mc",
      q: "<w k='how'>How</w> <w k='many'>many</w> <w k='usable'>usable</w> IPv4 host addresses exist in a `/26` <w k='subnet'>subnet</w> (`255.255.255.192`)?",
      opts: ["64", "62", "30", "126"],
      ans: 1,
      exp: "По формуле Уровня 19: `32 - 26 = 6` бит → `2^6 - 2 = 64 - 2 = 62` рабочих хоста!"
    },
    {
      id: "ex26", exam: "102", kind: "fill",
      q: "<w k='what'>What</w> is the compressed IPv6 <w k='loopback'>loopback</w> <w k='address'>address</w> equivalent to IPv4 `127.0.0.1`?",
      accepted: ["::1", "::1/128"],
      exp: "В IPv6 (Уровень 19) адрес петли Loopback записывается как `::1`."
    },
    {
      id: "ex27", exam: "102", kind: "fill",
      q: "<w k='which'>Which</w> <w k='file'>file</w> (<w k='full'>full</w> <w k='path'>path</w>) <w k='stores'>stores</w> <w k='local'>local</w> static IP-to-<w k='hostname'>hostname</w> mappings checked before DNS?",
      accepted: ["/etc/hosts"],
      exp: "`/etc/hosts` (Уровень 20) проверяется перед обращением к DNS-серверам из `/etc/resolv.conf`."
    },
    {
      id: "ex28", exam: "102", kind: "mc",
      q: "<w k='which'>Which</w> modern <w k='command'>command</w> <w k='lists'>lists</w> <w k='all'>all</w> <w k='listening'>listening</w> TCP and UDP <w k='sockets'>sockets</w> with numeric <w k='ports'>ports</w> and <w k='process'>process</w> names?",
      opts: ["ip route show", "ss -tulnp", "dig -x", "ethtool -S"],
      ans: 1,
      exp: "`ss -tulnp` (Уровень 20) показывает все открытые TCP/UDP порты в числах и процессы, которые их держат."
    },
    {
      id: "ex29", exam: "102", kind: "mc",
      q: "<w k='which'>Which</w> `curl` <w k='option'>option</w> fetches <w k='only'>ONLY</w> the HTTP response <w k='headers'>headers</w> (such as `200 OK` or `502 Bad Gateway`)?",
      opts: ["curl -I", "curl -X", "curl -d", "curl -o"],
      ans: 0,
      exp: "`curl -I` (Уровень 21) отправляет HEAD-запрос и выводит только HTTP-заголовки и код ответа сервера."
    },
    {
      id: "ex30", exam: "102", kind: "mc",
      q: "In `iptables` (Netfilter), <w k='which'>which</w> <w k='chain'>chain</w> filters <w k='incoming'>incoming</w> <w k='packets'>packets</w> addressed directly to the <w k='local'>local</w> <w k='server'>server</w>?",
      opts: ["FORWARD", "OUTPUT", "INPUT", "PREROUTING"],
      ans: 2,
      exp: "Цепочка `INPUT` (Уровень 23) фильтрует входящие пакеты, предназначенные процессам самого сервера (а `FORWARD` — транзитные)."
    }
  ],

  levels: [
    ...(window.CURRICULUM_Q1 || []),
    ...(window.CURRICULUM_Q2 || []),
    ...(window.CURRICULUM_Q3 || []),
    ...(window.CURRICULUM_Q4 || [])
  ].sort((a, b) => a.level - b.level)
};
