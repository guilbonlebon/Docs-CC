from pathlib import Path
import json

checks = [
    {
        "id": "CHK001",
        "slug": "admin_account",
        "script": "Check-AdminAccount.ps1",
        "level": "FATAL",
        "title_fr": "Compte administrateur disponible",
        "title_en": "Administrator Account Available",
        "description_fr": "Vérifie qu'un compte administrateur local ou de domaine est disponible pour l'installation.",
        "description_en": "Checks that a local or domain administrator account is available for the installation.",
        "resolution_fr": "Créer ou identifier un compte administrateur disposant des droits nécessaires puis relancer le contrôle.",
        "resolution_en": "Create or identify an administrator account with the required rights and run the check again."
    },
    {
        "id": "CHK002",
        "slug": "powershell_version",
        "script": "Check-PowerShellVersion.ps1",
        "level": "FATAL",
        "title_fr": "Version de PowerShell minimale",
        "title_en": "Minimum PowerShell Version",
        "description_fr": "Contrôle que PowerShell 5.1 ou supérieur est installé sur le poste cible.",
        "description_en": "Verifies that PowerShell 5.1 or later is installed on the target system.",
        "resolution_fr": "Mettre à jour PowerShell vers la version requise depuis Microsoft et redémarrer la session.",
        "resolution_en": "Update PowerShell to the required release from Microsoft and restart the session."
    },
    {
        "id": "CHK003",
        "slug": "dotnet_framework",
        "script": "Check-DotNetFramework.ps1",
        "level": "FATAL",
        "title_fr": ".NET Framework 4.8 présent",
        "title_en": ".NET Framework 4.8 Installed",
        "description_fr": "Valide que le composant .NET Framework 4.8 est activé sur la machine.",
        "description_en": "Ensures that the .NET Framework 4.8 component is enabled on the machine.",
        "resolution_fr": "Activer la fonctionnalité .NET Framework 4.8 via les fonctionnalités Windows ou le Centre d'installation.",
        "resolution_en": "Enable the .NET Framework 4.8 feature through Windows Features or Installation Center."
    },
    {
        "id": "CHK004",
        "slug": "windows_update_status",
        "script": "Check-WindowsUpdateStatus.ps1",
        "level": "ERROR",
        "title_fr": "État du service Windows Update",
        "title_en": "Windows Update Service State",
        "description_fr": "Confirme que le service Windows Update fonctionne et qu'aucune mise à jour critique n'est en attente.",
        "description_en": "Confirms that the Windows Update service is operational and no critical updates are pending.",
        "resolution_fr": "Redémarrer le service Windows Update et appliquer les mises à jour critiques disponibles.",
        "resolution_en": "Restart the Windows Update service and apply the available critical updates."
    },
    {
        "id": "CHK005",
        "slug": "system_disk_space",
        "script": "Check-SystemDiskSpace.ps1",
        "level": "FATAL",
        "title_fr": "Espace disque système suffisant",
        "title_en": "Sufficient System Disk Space",
        "description_fr": "S'assure que le lecteur système dispose d'au moins 20 Go d'espace libre.",
        "description_en": "Verifies that the system drive has at least 20 GB of free space.",
        "resolution_fr": "Libérer de l'espace disque ou étendre la partition système avant de relancer l'installation.",
        "resolution_en": "Free disk space or extend the system partition before restarting the installation."
    },
    {
        "id": "CHK006",
        "slug": "data_disk_space",
        "script": "Check-DataDiskSpace.ps1",
        "level": "ERROR",
        "title_fr": "Espace disque data disponible",
        "title_en": "Available Data Disk Space",
        "description_fr": "Vérifie la présence d'au moins 50 Go d'espace libre sur le volume de données.",
        "description_en": "Ensures that at least 50 GB of free space is available on the data volume.",
        "resolution_fr": "Libérer ou ajouter de l'espace sur le volume de données puis réexécuter le contrôle.",
        "resolution_en": "Free or add space on the data volume and rerun the check."
    },
    {
        "id": "CHK007",
        "slug": "memory_available",
        "script": "Check-MemoryAvailable.ps1",
        "level": "FATAL",
        "title_fr": "Mémoire vive disponible",
        "title_en": "Available RAM",
        "description_fr": "Contrôle que 16 Go de mémoire vive sont disponibles pour l'application.",
        "description_en": "Checks that 16 GB of RAM are available for the application.",
        "resolution_fr": "Ajouter de la mémoire ou libérer des ressources pour atteindre la capacité minimale.",
        "resolution_en": "Add memory or release resources to meet the minimum capacity."
    },
    {
        "id": "CHK008",
        "slug": "cpu_architecture",
        "script": "Check-CPUArchitecture.ps1",
        "level": "FATAL",
        "title_fr": "Architecture processeur 64 bits",
        "title_en": "64-bit Processor Architecture",
        "description_fr": "S'assure que le système d'exploitation et le processeur sont en 64 bits.",
        "description_en": "Ensures that both the operating system and the processor are 64-bit.",
        "resolution_fr": "Utiliser un serveur compatible 64 bits avant l'installation.",
        "resolution_en": "Use a 64-bit capable server before proceeding with the installation."
    },
    {
        "id": "CHK009",
        "slug": "virtualization_enabled",
        "script": "Check-Virtualization.ps1",
        "level": "WARNING",
        "title_fr": "Virtualisation matériel activée",
        "title_en": "Hardware Virtualization Enabled",
        "description_fr": "Vérifie que la virtualisation matérielle est activée dans le BIOS pour les environnements virtualisés.",
        "description_en": "Checks that hardware virtualization is enabled in the BIOS for virtualized environments.",
        "resolution_fr": "Activer la virtualisation matérielle (Intel VT-x/AMD-V) dans le BIOS ou l'hyperviseur.",
        "resolution_en": "Enable hardware virtualization (Intel VT-x/AMD-V) in the BIOS or hypervisor."
    },
    {
        "id": "CHK010",
        "slug": "secure_boot",
        "script": "Check-SecureBoot.ps1",
        "level": "INFO",
        "title_fr": "Statut de Secure Boot",
        "title_en": "Secure Boot Status",
        "description_fr": "Informe de l'état de la fonctionnalité Secure Boot sur le serveur.",
        "description_en": "Provides the status of the Secure Boot feature on the server.",
        "resolution_fr": "Adapter la configuration selon les recommandations de sécurité internes si nécessaire.",
        "resolution_en": "Adjust configuration according to internal security recommendations if required."
    },
    {
        "id": "CHK011",
        "slug": "tpm_availability",
        "script": "Check-TPM.ps1",
        "level": "WARNING",
        "title_fr": "Présence du module TPM",
        "title_en": "TPM Module Presence",
        "description_fr": "Vérifie si un module TPM 2.0 est présent et opérationnel.",
        "description_en": "Checks whether a TPM 2.0 module is present and operational.",
        "resolution_fr": "Installer ou activer le module TPM si requis par la politique de sécurité.",
        "resolution_en": "Install or enable the TPM module if required by the security policy."
    },
    {
        "id": "CHK012",
        "slug": "antivirus_installed",
        "script": "Check-Antivirus.ps1",
        "level": "ERROR",
        "title_fr": "Antivirus installé et à jour",
        "title_en": "Antivirus Installed and Updated",
        "description_fr": "S'assure qu'une solution antivirus supportée est active et à jour.",
        "description_en": "Ensures that a supported antivirus solution is running and up to date.",
        "resolution_fr": "Installer ou mettre à jour la solution antivirus puis relancer le contrôle.",
        "resolution_en": "Install or update the antivirus solution and rerun the check."
    },
    {
        "id": "CHK013",
        "slug": "defender_exclusions",
        "script": "Check-DefenderExclusions.ps1",
        "level": "WARNING",
        "title_fr": "Exclusions Windows Defender",
        "title_en": "Windows Defender Exclusions",
        "description_fr": "Contrôle la présence des exclusions recommandées pour l'application dans Windows Defender.",
        "description_en": "Checks that the recommended exclusions for the application are configured in Windows Defender.",
        "resolution_fr": "Ajouter les répertoires et processus concernés à la liste d'exclusion de l'antivirus.",
        "resolution_en": "Add the required directories and processes to the antivirus exclusion list."
    },
    {
        "id": "CHK014",
        "slug": "firewall_configuration",
        "script": "Check-FirewallRules.ps1",
        "level": "ERROR",
        "title_fr": "Configuration du pare-feu",
        "title_en": "Firewall Configuration",
        "description_fr": "Vérifie que les ports requis par Pre-Check sont ouverts sur le pare-feu Windows.",
        "description_en": "Verifies that the ports required by Pre-Check are open on the Windows firewall.",
        "resolution_fr": "Créer ou activer les règles de pare-feu nécessaires pour les ports listés dans le guide d'installation.",
        "resolution_en": "Create or enable firewall rules for the ports listed in the installation guide."
    },
    {
        "id": "CHK015",
        "slug": "network_connectivity",
        "script": "Check-NetworkConnectivity.ps1",
        "level": "ERROR",
        "title_fr": "Connectivité réseau",
        "title_en": "Network Connectivity",
        "description_fr": "Valide que le serveur peut contacter les ressources réseau nécessaires (base de données, services internes).",
        "description_en": "Validates that the server can reach the required network resources (database, internal services).",
        "resolution_fr": "Diagnostiquer la connectivité réseau et autoriser les flux nécessaires avant l'installation.",
        "resolution_en": "Troubleshoot network connectivity and allow required traffic before installation."
    },
    {
        "id": "CHK016",
        "slug": "proxy_detection",
        "script": "Check-Proxy.ps1",
        "level": "INFO",
        "title_fr": "Détection d'un proxy système",
        "title_en": "System Proxy Detection",
        "description_fr": "Informe si un proxy système est configuré pour la sortie Internet.",
        "description_en": "Reports whether a system proxy is configured for outbound internet access.",
        "resolution_fr": "Adapter la configuration applicative si un proxy est nécessaire à l'exploitation.",
        "resolution_en": "Adjust application settings if a proxy is required for operation."
    },
    {
        "id": "CHK017",
        "slug": "dns_resolution",
        "script": "Check-DnsResolution.ps1",
        "level": "ERROR",
        "title_fr": "Résolution DNS",
        "title_en": "DNS Resolution",
        "description_fr": "Teste la résolution DNS vers les hôtes critiques identifiés par Pre-Check.",
        "description_en": "Tests DNS resolution to the critical hosts identified by Pre-Check.",
        "resolution_fr": "Corriger la configuration DNS ou ajouter les enregistrements requis.",
        "resolution_en": "Fix the DNS configuration or add the required records."
    },
    {
        "id": "CHK018",
        "slug": "time_synchronization",
        "script": "Check-TimeSync.ps1",
        "level": "ERROR",
        "title_fr": "Synchronisation horaire",
        "title_en": "Time Synchronization",
        "description_fr": "Vérifie que la synchronisation de l'heure avec la source NTP d'entreprise est fonctionnelle.",
        "description_en": "Verifies that time synchronization with the corporate NTP source is functional.",
        "resolution_fr": "Configurer le service de temps Windows pour utiliser la source NTP officielle et resynchroniser.",
        "resolution_en": "Configure the Windows time service to use the official NTP source and resync."
    },
    {
        "id": "CHK019",
        "slug": "ntp_reachability",
        "script": "Check-NtpReachability.ps1",
        "level": "WARNING",
        "title_fr": "Accessibilité du serveur NTP",
        "title_en": "NTP Server Reachability",
        "description_fr": "Contrôle la capacité du serveur à joindre le service NTP déclaré.",
        "description_en": "Checks the server's ability to reach the declared NTP service.",
        "resolution_fr": "Ouvrir le trafic UDP 123 vers la source NTP ou définir une source alternative accessible.",
        "resolution_en": "Allow UDP 123 traffic to the NTP source or define an accessible alternative."
    },
    {
        "id": "CHK020",
        "slug": "domain_membership",
        "script": "Check-DomainMembership.ps1",
        "level": "FATAL",
        "title_fr": "Appartenance au domaine",
        "title_en": "Domain Membership",
        "description_fr": "S'assure que le serveur est joint au domaine requis par l'application.",
        "description_en": "Ensures that the server is joined to the domain required by the application.",
        "resolution_fr": "Joindre le serveur au domaine cible avec un compte autorisé puis relancer le contrôle.",
        "resolution_en": "Join the server to the target domain with an authorized account and rerun the check."
    },
    {
        "id": "CHK021",
        "slug": "local_admin_rights",
        "script": "Check-LocalAdminRights.ps1",
        "level": "FATAL",
        "title_fr": "Droits administrateur local",
        "title_en": "Local Administrator Rights",
        "description_fr": "Vérifie que l'utilisateur en cours possède des droits administrateur locaux.",
        "description_en": "Checks that the current user has local administrator rights.",
        "resolution_fr": "Utiliser un compte membre du groupe Administrateurs locaux ou demander les droits nécessaires.",
        "resolution_en": "Use an account that belongs to the local Administrators group or request the required rights."
    },
    {
        "id": "CHK022",
        "slug": "uac_status",
        "script": "Check-UAC.ps1",
        "level": "WARNING",
        "title_fr": "Configuration du contrôle de compte utilisateur",
        "title_en": "User Account Control Configuration",
        "description_fr": "Analyse la configuration UAC pour identifier les restrictions potentielles.",
        "description_en": "Analyses the UAC configuration to identify potential restrictions.",
        "resolution_fr": "Ajuster temporairement le niveau UAC si le scénario d'installation le requiert.",
        "resolution_en": "Temporarily adjust the UAC level if the installation scenario requires it."
    },
    {
        "id": "CHK023",
        "slug": "remote_desktop",
        "script": "Check-RemoteDesktop.ps1",
        "level": "INFO",
        "title_fr": "Activation du Bureau à distance",
        "title_en": "Remote Desktop Activation",
        "description_fr": "Indique si l'accès Bureau à distance est activé sur le serveur.",
        "description_en": "Indicates whether Remote Desktop access is enabled on the server.",
        "resolution_fr": "Activer le Bureau à distance selon les besoins d'administration.",
        "resolution_en": "Enable Remote Desktop according to administrative needs."
    },
    {
        "id": "CHK024",
        "slug": "smb_protocol_version",
        "script": "Check-SMBVersion.ps1",
        "level": "ERROR",
        "title_fr": "Version du protocole SMB",
        "title_en": "SMB Protocol Version",
        "description_fr": "Contrôle que SMBv2 minimum est activé pour les échanges fichiers.",
        "description_en": "Ensures that SMBv2 or later is enabled for file exchanges.",
        "resolution_fr": "Activer SMBv2/SMBv3 via les fonctionnalités Windows ou la stratégie de groupe.",
        "resolution_en": "Enable SMBv2/SMBv3 through Windows Features or Group Policy."
    },
    {
        "id": "CHK025",
        "slug": "power_plan",
        "script": "Check-PowerPlan.ps1",
        "level": "WARNING",
        "title_fr": "Plan d'alimentation hautes performances",
        "title_en": "High Performance Power Plan",
        "description_fr": "Vérifie que le plan d'alimentation est défini sur Hautes performances pour les serveurs physiques.",
        "description_en": "Checks that the power plan is set to High Performance for physical servers.",
        "resolution_fr": "Sélectionner le plan Hautes performances ou appliquer une stratégie dédiée.",
        "resolution_en": "Select the High Performance plan or apply a dedicated policy."
    },
    {
        "id": "CHK026",
        "slug": "critical_services",
        "script": "Check-CriticalServices.ps1",
        "level": "ERROR",
        "title_fr": "Services Windows critiques",
        "title_en": "Critical Windows Services",
        "description_fr": "S'assure que les services Windows indispensables (BITS, WMI, RPC) sont en cours d'exécution.",
        "description_en": "Ensures that indispensable Windows services (BITS, WMI, RPC) are running.",
        "resolution_fr": "Démarrer ou réparer les services critiques identifiés puis relancer le contrôle.",
        "resolution_en": "Start or repair the identified critical services and rerun the check."
    },
    {
        "id": "CHK027",
        "slug": "event_log_health",
        "script": "Check-EventLogs.ps1",
        "level": "WARNING",
        "title_fr": "Santé des journaux d'événements",
        "title_en": "Event Log Health",
        "description_fr": "Vérifie la présence d'erreurs critiques récentes dans les journaux système et application.",
        "description_en": "Checks for recent critical errors in the system and application event logs.",
        "resolution_fr": "Analyser les événements signalés et corriger les anomalies avant l'installation.",
        "resolution_en": "Analyze the reported events and fix anomalies before installation."
    },
    {
        "id": "CHK028",
        "slug": "dotnet_feature",
        "script": "Check-DotNetFeature.ps1",
        "level": "ERROR",
        "title_fr": "Fonctionnalité .NET Core",
        "title_en": ".NET Core Feature",
        "description_fr": "Valide que l'hébergement .NET Core requis est présent pour les services web.",
        "description_en": "Validates that the required .NET Core hosting bundle is present for web services.",
        "resolution_fr": "Installer le bundle d'hébergement .NET Core recommandé.",
        "resolution_en": "Install the recommended .NET Core hosting bundle."
    },
    {
        "id": "CHK029",
        "slug": "iis_feature",
        "script": "Check-IISFeature.ps1",
        "level": "ERROR",
        "title_fr": "Rôles IIS requis",
        "title_en": "Required IIS Roles",
        "description_fr": "S'assure que les rôles IIS nécessaires sont installés pour l'application Pre-Check.",
        "description_en": "Ensures that the required IIS roles are installed for the Pre-Check application.",
        "resolution_fr": "Installer les rôles et fonctionnalités IIS listés dans la documentation technique.",
        "resolution_en": "Install the IIS roles and features listed in the technical documentation."
    },
    {
        "id": "CHK030",
        "slug": "hyperv_feature",
        "script": "Check-HyperV.ps1",
        "level": "WARNING",
        "title_fr": "Fonctionnalité Hyper-V",
        "title_en": "Hyper-V Feature",
        "description_fr": "Informe de la présence de la fonctionnalité Hyper-V sur le serveur.",
        "description_en": "Reports whether the Hyper-V feature is present on the server.",
        "resolution_fr": "Installer ou désinstaller Hyper-V selon la politique d'hébergement retenue.",
        "resolution_en": "Install or remove Hyper-V according to the selected hosting policy."
    },
    {
        "id": "CHK031",
        "slug": "sql_server_installed",
        "script": "Check-SqlServerInstalled.ps1",
        "level": "FATAL",
        "title_fr": "Présence de SQL Server",
        "title_en": "SQL Server Presence",
        "description_fr": "Vérifie qu'une instance SQL Server supportée est disponible pour l'application.",
        "description_en": "Checks that a supported SQL Server instance is available for the application.",
        "resolution_fr": "Installer une instance SQL Server compatible avec les prérequis de Pre-Check.",
        "resolution_en": "Install a SQL Server instance compatible with Pre-Check prerequisites."
    },
    {
        "id": "CHK032",
        "slug": "sql_server_version",
        "script": "Check-SqlServerVersion.ps1",
        "level": "ERROR",
        "title_fr": "Version de SQL Server",
        "title_en": "SQL Server Version",
        "description_fr": "S'assure que l'instance SQL Server répond au niveau de version minimal supporté.",
        "description_en": "Ensures that the SQL Server instance meets the minimum supported version level.",
        "resolution_fr": "Mettre à niveau SQL Server ou appliquer les derniers Service Packs et Cumulative Updates.",
        "resolution_en": "Upgrade SQL Server or apply the latest Service Packs and Cumulative Updates."
    },
    {
        "id": "CHK033",
        "slug": "sql_service_status",
        "script": "Check-SqlServiceStatus.ps1",
        "level": "FATAL",
        "title_fr": "Service SQL Server démarré",
        "title_en": "SQL Server Service Running",
        "description_fr": "Confirme que le service de l'instance SQL Server cible est démarré.",
        "description_en": "Confirms that the target SQL Server instance service is running.",
        "resolution_fr": "Démarrer le service SQL Server et s'assurer qu'il démarre automatiquement.",
        "resolution_en": "Start the SQL Server service and ensure it starts automatically."
    },
    {
        "id": "CHK034",
        "slug": "sql_ports",
        "script": "Check-SqlPorts.ps1",
        "level": "ERROR",
        "title_fr": "Ports SQL Server accessibles",
        "title_en": "SQL Server Ports Accessible",
        "description_fr": "Vérifie l'accessibilité des ports TCP utilisés par SQL Server depuis le serveur applicatif.",
        "description_en": "Checks that the TCP ports used by SQL Server are reachable from the application server.",
        "resolution_fr": "Ouvrir les ports SQL requis dans le pare-feu réseau ou local.",
        "resolution_en": "Open the required SQL ports in the network or local firewall."
    },
    {
        "id": "CHK035",
        "slug": "sql_collation",
        "script": "Check-SqlCollation.ps1",
        "level": "ERROR",
        "title_fr": "Collation SQL Server",
        "title_en": "SQL Server Collation",
        "description_fr": "Contrôle que la collation de l'instance SQL correspond aux prérequis de l'application.",
        "description_en": "Ensures that the SQL Server instance collation matches the application's prerequisites.",
        "resolution_fr": "Créer une nouvelle instance avec la bonne collation ou ajuster l'existante si possible.",
        "resolution_en": "Create a new instance with the correct collation or adjust the existing one if possible."
    },
    {
        "id": "CHK036",
        "slug": "sql_agent_account",
        "script": "Check-SqlAgentAccount.ps1",
        "level": "WARNING",
        "title_fr": "Compte de service SQL Agent",
        "title_en": "SQL Agent Service Account",
        "description_fr": "Informe sur le compte utilisé par SQL Server Agent et ses droits.",
        "description_en": "Reports on the account used by SQL Server Agent and its rights.",
        "resolution_fr": "Vérifier que le compte SQL Agent possède les autorisations recommandées.",
        "resolution_en": "Validate that the SQL Agent account has the recommended permissions."
    },
    {
        "id": "CHK037",
        "slug": "database_disk_latency",
        "script": "Check-DatabaseLatency.ps1",
        "level": "WARNING",
        "title_fr": "Latence disque base de données",
        "title_en": "Database Disk Latency",
        "description_fr": "Mesure la latence moyenne des volumes hébergeant les fichiers de base de données.",
        "description_en": "Measures the average latency of the volumes hosting the database files.",
        "resolution_fr": "Optimiser le stockage ou déplacer les fichiers vers un volume plus performant.",
        "resolution_en": "Optimize storage or move the files to a faster volume."
    },
    {
        "id": "CHK038",
        "slug": "database_backup_path",
        "script": "Check-DatabaseBackupPath.ps1",
        "level": "INFO",
        "title_fr": "Chemin de sauvegarde SQL",
        "title_en": "SQL Backup Path",
        "description_fr": "Documente l'emplacement de sauvegarde configuré pour les bases de données Pre-Check.",
        "description_en": "Documents the configured backup location for Pre-Check databases.",
        "resolution_fr": "Valider que le chemin est sécurisé et dispose de l'espace requis.",
        "resolution_en": "Confirm that the path is secured and has the required space."
    },
    {
        "id": "CHK039",
        "slug": "odbc_driver_version",
        "script": "Check-OdbcDriver.ps1",
        "level": "ERROR",
        "title_fr": "Version du pilote ODBC",
        "title_en": "ODBC Driver Version",
        "description_fr": "S'assure que le pilote ODBC SQL natif Microsoft 18 ou supérieur est installé.",
        "description_en": "Ensures that the Microsoft ODBC Driver 18 or later is installed.",
        "resolution_fr": "Installer la version supportée du pilote ODBC depuis le centre de téléchargement Microsoft.",
        "resolution_en": "Install the supported ODBC driver version from the Microsoft download center."
    },
    {
        "id": "CHK040",
        "slug": "vc_runtime",
        "script": "Check-VCRuntime.ps1",
        "level": "ERROR",
        "title_fr": "Redistribuables Visual C++",
        "title_en": "Visual C++ Redistributables",
        "description_fr": "Vérifie que les packages Visual C++ 2015-2022 x64 sont installés.",
        "description_en": "Checks that the Visual C++ 2015-2022 x64 packages are installed.",
        "resolution_fr": "Installer les redistribuables Visual C++ depuis le support officiel.",
        "resolution_en": "Install the Visual C++ redistributables from the official media."
    },
    {
        "id": "CHK041",
        "slug": "printer_spooler",
        "script": "Check-PrintSpooler.ps1",
        "level": "WARNING",
        "title_fr": "Service Spouleur d'impression",
        "title_en": "Print Spooler Service",
        "description_fr": "Informe sur l'état du service Spouleur d'impression.",
        "description_en": "Reports on the state of the Print Spooler service.",
        "resolution_fr": "Désactiver le service si non requis pour limiter la surface d'attaque.",
        "resolution_en": "Disable the service if not required to limit the attack surface."
    },
    {
        "id": "CHK042",
        "slug": "windows_installer_service",
        "script": "Check-WindowsInstaller.ps1",
        "level": "ERROR",
        "title_fr": "Service Windows Installer",
        "title_en": "Windows Installer Service",
        "description_fr": "Vérifie que le service Windows Installer fonctionne correctement.",
        "description_en": "Checks that the Windows Installer service operates correctly.",
        "resolution_fr": "Réparer Windows Installer via les commandes MSIExec ou les composants Windows.",
        "resolution_en": "Repair Windows Installer through MSIExec commands or Windows components."
    },
    {
        "id": "CHK043",
        "slug": "pending_reboot",
        "script": "Check-PendingReboot.ps1",
        "level": "ERROR",
        "title_fr": "Redémarrage en attente",
        "title_en": "Pending Reboot",
        "description_fr": "Détecte si un redémarrage du système est en attente suite à des installations précédentes.",
        "description_en": "Detects whether a system reboot is pending after previous installations.",
        "resolution_fr": "Redémarrer le serveur pour appliquer les modifications en attente.",
        "resolution_en": "Restart the server to apply pending changes."
    },
    {
        "id": "CHK044",
        "slug": "reboot_history",
        "script": "Check-RebootHistory.ps1",
        "level": "INFO",
        "title_fr": "Historique des redémarrages",
        "title_en": "Reboot History",
        "description_fr": "Documente la date du dernier redémarrage du serveur.",
        "description_en": "Documents the server's last reboot date.",
        "resolution_fr": "Planifier un redémarrage si le serveur n'a pas été redémarré récemment.",
        "resolution_en": "Plan a restart if the server has not rebooted recently."
    },
    {
        "id": "CHK045",
        "slug": "driver_status",
        "script": "Check-DriverStatus.ps1",
        "level": "WARNING",
        "title_fr": "Pilotes matériels critiques",
        "title_en": "Critical Hardware Drivers",
        "description_fr": "Vérifie la présence de pilotes obsolètes ou en erreur sur les composants critiques.",
        "description_en": "Checks for outdated or faulty drivers on critical components.",
        "resolution_fr": "Mettre à jour les pilotes concernés via le support constructeur.",
        "resolution_en": "Update the affected drivers using the vendor support resources."
    },
    {
        "id": "CHK046",
        "slug": "usb_ports",
        "script": "Check-UsbPorts.ps1",
        "level": "INFO",
        "title_fr": "Statut des ports USB",
        "title_en": "USB Port Status",
        "description_fr": "Informe de l'activation ou non des ports USB pour les périphériques externes.",
        "description_en": "Reports whether USB ports for external devices are enabled.",
        "resolution_fr": "Désactiver les ports inutiles selon les politiques de sécurité.",
        "resolution_en": "Disable unused ports according to security policies."
    },
    {
        "id": "CHK047",
        "slug": "smartscreen",
        "script": "Check-SmartScreen.ps1",
        "level": "INFO",
        "title_fr": "Statut de Microsoft SmartScreen",
        "title_en": "Microsoft SmartScreen Status",
        "description_fr": "Indique si SmartScreen est activé sur le serveur.",
        "description_en": "Indicates whether SmartScreen is enabled on the server.",
        "resolution_fr": "Adapter le paramètre selon la stratégie de sécurité interne.",
        "resolution_en": "Adjust the setting according to internal security policy."
    },
    {
        "id": "CHK048",
        "slug": "defender_realtime",
        "script": "Check-DefenderRealtime.ps1",
        "level": "WARNING",
        "title_fr": "Protection temps réel Windows Defender",
        "title_en": "Windows Defender Real-Time Protection",
        "description_fr": "Vérifie l'état de la protection temps réel et des analyses planifiées.",
        "description_en": "Checks the status of real-time protection and scheduled scans.",
        "resolution_fr": "S'assurer que la protection reste active ou définir une solution de remplacement approuvée.",
        "resolution_en": "Ensure protection stays active or define an approved alternative solution."
    },
    {
        "id": "CHK049",
        "slug": "local_policy_audit",
        "script": "Check-LocalPolicyAudit.ps1",
        "level": "INFO",
        "title_fr": "Stratégie d'audit locale",
        "title_en": "Local Audit Policy",
        "description_fr": "Documente la configuration de la stratégie d'audit locale.",
        "description_en": "Documents the configuration of the local audit policy.",
        "resolution_fr": "Adapter la stratégie pour répondre aux exigences de conformité si besoin.",
        "resolution_en": "Adjust the policy to meet compliance requirements if needed."
    },
    {
        "id": "CHK050",
        "slug": "event_log_size",
        "script": "Check-EventLogSize.ps1",
        "level": "WARNING",
        "title_fr": "Taille des journaux d'événements",
        "title_en": "Event Log Size",
        "description_fr": "Analyse la taille maximale et le mode de conservation des journaux.",
        "description_en": "Analyses the maximum size and retention mode of the logs.",
        "resolution_fr": "Augmenter la taille ou modifier la rétention pour éviter les pertes d'événements.",
        "resolution_en": "Increase the size or adjust retention to prevent event loss."
    },
    {
        "id": "CHK051",
        "slug": "crash_dump",
        "script": "Check-CrashDump.ps1",
        "level": "INFO",
        "title_fr": "Configuration des fichiers de vidage",
        "title_en": "Crash Dump Configuration",
        "description_fr": "Informe sur la configuration de génération des fichiers de vidage mémoire.",
        "description_en": "Reports the configuration for generating memory dump files.",
        "resolution_fr": "Définir un emplacement sécurisé et dimensionné si la collecte de dumps est requise.",
        "resolution_en": "Set a secure and sized location if dump collection is required."
    },
    {
        "id": "CHK052",
        "slug": "paging_file",
        "script": "Check-PagingFile.ps1",
        "level": "WARNING",
        "title_fr": "Fichier d'échange dimensionné",
        "title_en": "Paging File Sized",
        "description_fr": "Vérifie que le fichier d'échange correspond aux recommandations Microsoft.",
        "description_en": "Checks that the paging file matches Microsoft recommendations.",
        "resolution_fr": "Ajuster la taille du fichier d'échange ou laisser le système gérer automatiquement.",
        "resolution_en": "Adjust the paging file size or allow the system to manage it automatically."
    },
    {
        "id": "CHK053",
        "slug": "temp_folder_permissions",
        "script": "Check-TempPermissions.ps1",
        "level": "ERROR",
        "title_fr": "Permissions du dossier TEMP",
        "title_en": "TEMP Folder Permissions",
        "description_fr": "S'assure que le dossier TEMP dispose des autorisations en lecture/écriture pour le service.",
        "description_en": "Ensures that the TEMP folder grants read/write permissions for the service.",
        "resolution_fr": "Accorder les droits NTFS nécessaires sur le dossier TEMP de l'utilisateur de service.",
        "resolution_en": "Grant the required NTFS permissions on the service user's TEMP folder."
    },
    {
        "id": "CHK054",
        "slug": "installation_path",
        "script": "Check-InstallPath.ps1",
        "level": "FATAL",
        "title_fr": "Chemin d'installation accessible",
        "title_en": "Installation Path Accessible",
        "description_fr": "Vérifie que le répertoire cible de l'installation est accessible en lecture/écriture.",
        "description_en": "Checks that the target installation directory is readable and writable.",
        "resolution_fr": "Créer le répertoire ou ajuster les permissions avant d'installer le produit.",
        "resolution_en": "Create the directory or adjust permissions before installing the product."
    },
    {
        "id": "CHK055",
        "slug": "service_account_password",
        "script": "Check-ServiceAccountPassword.ps1",
        "level": "WARNING",
        "title_fr": "Âge du mot de passe du compte de service",
        "title_en": "Service Account Password Age",
        "description_fr": "Analyse la date de dernière modification du mot de passe du compte de service.",
        "description_en": "Analyses the last password change date for the service account.",
        "resolution_fr": "Renouveler le mot de passe si la politique de sécurité l'impose.",
        "resolution_en": "Renew the password if required by the security policy."
    },
    {
        "id": "CHK056",
        "slug": "service_account_spn",
        "script": "Check-ServiceAccountSPN.ps1",
        "level": "ERROR",
        "title_fr": "SPN du compte de service",
        "title_en": "Service Account SPN",
        "description_fr": "Contrôle que le SPN requis est déclaré pour le compte de service applicatif.",
        "description_en": "Ensures that the required SPN is set for the application service account.",
        "resolution_fr": "Enregistrer le SPN via setspn.exe ou le centre d'administration Active Directory.",
        "resolution_en": "Register the SPN using setspn.exe or the Active Directory administration center."
    },
    {
        "id": "CHK057",
        "slug": "ad_connectivity",
        "script": "Check-ADConnectivity.ps1",
        "level": "ERROR",
        "title_fr": "Connectivité Active Directory",
        "title_en": "Active Directory Connectivity",
        "description_fr": "Vérifie que le serveur peut interroger les contrôleurs de domaine requis.",
        "description_en": "Checks that the server can query the required domain controllers.",
        "resolution_fr": "Ouvrir les ports LDAP/LDAPS et vérifier la résolution DNS vers les contrôleurs.",
        "resolution_en": "Open LDAP/LDAPS ports and check DNS resolution to the controllers."
    },
    {
        "id": "CHK058",
        "slug": "ldap_over_ssl",
        "script": "Check-LDAPSSL.ps1",
        "level": "WARNING",
        "title_fr": "Disponibilité LDAP sur SSL",
        "title_en": "LDAP over SSL Availability",
        "description_fr": "Contrôle l'accessibilité du service LDAPS sur les contrôleurs de domaine.",
        "description_en": "Checks LDAPS accessibility on the domain controllers.",
        "resolution_fr": "Installer un certificat valide sur les contrôleurs et autoriser le port 636.",
        "resolution_en": "Install a valid certificate on the controllers and allow port 636."
    },
    {
        "id": "CHK059",
        "slug": "certificate_store",
        "script": "Check-CertificateStore.ps1",
        "level": "WARNING",
        "title_fr": "Certificats requis",
        "title_en": "Required Certificates",
        "description_fr": "Vérifie la présence des certificats racine et serveur nécessaires à l'application.",
        "description_en": "Checks that the required root and server certificates are available.",
        "resolution_fr": "Importer les certificats manquants dans le magasin approprié.",
        "resolution_en": "Import the missing certificates into the appropriate store."
    },
    {
        "id": "CHK060",
        "slug": "windows_activation",
        "script": "Check-WindowsActivation.ps1",
        "level": "WARNING",
        "title_fr": "Activation de Windows",
        "title_en": "Windows Activation",
        "description_fr": "Contrôle que Windows est activé conformément à la licence.",
        "description_en": "Checks that Windows is activated according to the license.",
        "resolution_fr": "Procéder à l'activation de Windows via KMS ou clé MAK valide.",
        "resolution_en": "Activate Windows using a valid KMS or MAK key."
    },
    {
        "id": "CHK061",
        "slug": "system_locale",
        "script": "Check-SystemLocale.ps1",
        "level": "INFO",
        "title_fr": "Langue système",
        "title_en": "System Locale",
        "description_fr": "Documente la langue système configurée sur le serveur.",
        "description_en": "Documents the system locale configured on the server.",
        "resolution_fr": "Adapter la langue si nécessaire pour l'application.",
        "resolution_en": "Adjust the locale if required for the application."
    },
    {
        "id": "CHK062",
        "slug": "timezone_configuration",
        "script": "Check-Timezone.ps1",
        "level": "WARNING",
        "title_fr": "Fuseau horaire conforme",
        "title_en": "Compliant Time Zone",
        "description_fr": "Vérifie que le fuseau horaire correspond au site d'installation.",
        "description_en": "Ensures that the time zone matches the installation site.",
        "resolution_fr": "Configurer le fuseau horaire correct et synchroniser l'heure.",
        "resolution_en": "Configure the correct time zone and synchronize the clock."
    },
    {
        "id": "CHK063",
        "slug": "keyboard_layout",
        "script": "Check-KeyboardLayout.ps1",
        "level": "INFO",
        "title_fr": "Disposition de clavier",
        "title_en": "Keyboard Layout",
        "description_fr": "Informe sur la disposition de clavier active pour les sessions locales.",
        "description_en": "Reports the active keyboard layout for local sessions.",
        "resolution_fr": "Ajouter ou réorganiser les dispositions de clavier selon les besoins opérationnels.",
        "resolution_en": "Add or reorder keyboard layouts according to operational needs."
    },
    {
        "id": "CHK064",
        "slug": "regional_settings",
        "script": "Check-RegionalSettings.ps1",
        "level": "WARNING",
        "title_fr": "Paramètres régionaux",
        "title_en": "Regional Settings",
        "description_fr": "Contrôle les formats de date, heure et séparateurs configurés.",
        "description_en": "Checks the configured date, time, and separator formats.",
        "resolution_fr": "Aligner les paramètres régionaux avec les attentes des applications métiers.",
        "resolution_en": "Align regional settings with business application expectations."
    },
    {
        "id": "CHK065",
        "slug": "high_contrast",
        "script": "Check-HighContrast.ps1",
        "level": "INFO",
        "title_fr": "Mode contraste élevé",
        "title_en": "High Contrast Mode",
        "description_fr": "Informe si le mode contraste élevé est activé sur la session.",
        "description_en": "Reports whether high contrast mode is enabled on the session.",
        "resolution_fr": "Désactiver le mode si cela perturbe la lisibilité des consoles techniques.",
        "resolution_en": "Disable the mode if it affects the readability of technical consoles."
    },
    {
        "id": "CHK066",
        "slug": "screen_resolution",
        "script": "Check-ScreenResolution.ps1",
        "level": "WARNING",
        "title_fr": "Résolution d'écran minimale",
        "title_en": "Minimum Screen Resolution",
        "description_fr": "Vérifie que la résolution est au moins 1920x1080 pour le confort d'administration.",
        "description_en": "Checks that the resolution is at least 1920x1080 for administration comfort.",
        "resolution_fr": "Ajuster la résolution de l'affichage ou utiliser une console distante adaptée.",
        "resolution_en": "Adjust the display resolution or use a suitable remote console."
    },
    {
        "id": "CHK067",
        "slug": "edge_version",
        "script": "Check-EdgeVersion.ps1",
        "level": "ERROR",
        "title_fr": "Version de Microsoft Edge",
        "title_en": "Microsoft Edge Version",
        "description_fr": "S'assure que la version d'Edge est au minimum 109 pour la compatibilité.",
        "description_en": "Ensures that Edge version is at least 109 for compatibility.",
        "resolution_fr": "Mettre à jour Microsoft Edge via Windows Update ou un package hors ligne.",
        "resolution_en": "Update Microsoft Edge via Windows Update or an offline package."
    },
    {
        "id": "CHK068",
        "slug": "execution_policy",
        "script": "Check-ExecutionPolicy.ps1",
        "level": "ERROR",
        "title_fr": "Stratégie d'exécution PowerShell",
        "title_en": "PowerShell Execution Policy",
        "description_fr": "Contrôle que la stratégie d'exécution autorise les scripts signés nécessaires.",
        "description_en": "Ensures that the execution policy allows the required signed scripts.",
        "resolution_fr": "Définir la stratégie sur RemoteSigned ou Bypass pour le contexte d'installation.",
        "resolution_en": "Set the policy to RemoteSigned or Bypass for the installation context."
    },
    {
        "id": "CHK069",
        "slug": "windows_version",
        "script": "Check-WindowsVersion.ps1",
        "level": "FATAL",
        "title_fr": "Version de Windows supportée",
        "title_en": "Supported Windows Version",
        "description_fr": "Vérifie que le système d'exploitation est Windows Server 2019 ou Windows 10 22H2 minimum.",
        "description_en": "Checks that the operating system is Windows Server 2019 or Windows 10 22H2 minimum.",
        "resolution_fr": "Mettre à jour vers une version de Windows supportée avant l'installation.",
        "resolution_en": "Upgrade to a supported Windows version before installation."
    },
]

root = Path('.')
(root / 'assets' / 'css').mkdir(parents=True, exist_ok=True)
(root / 'assets' / 'js').mkdir(parents=True, exist_ok=True)
(root / 'checks').mkdir(parents=True, exist_ok=True)

manifest_data = [
    {
        "id": item["id"],
        "script": item["script"],
        "level": item["level"],
        "title_fr": item["title_fr"],
        "title_en": item["title_en"],
        "file": f"checks/{item['slug']}.html",
    }
    for item in checks
]

(root / 'manifest.json').write_text(json.dumps(manifest_data, ensure_ascii=False, indent=2), encoding='utf-8')

detail_template = """<!DOCTYPE html>
<html lang=\"fr\">
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
    <title>{title_fr} · Pre-Check</title>
    <link rel=\"stylesheet\" href=\"../assets/css/style.css\" />
  </head>
  <body data-page=\"detail\">
    <header class=\"primary-header\" role=\"banner\">
      <div class=\"header-content\">
        <a class=\"brand\" href=\"../index.html\">
          <span class=\"brand-title\">Centre MAESTRIA</span>
          <span class=\"brand-subtitle\">Consistency Checker</span>
        </a>
        <button\n          class=\"language-switch\"\n          type=\"button\"\n          role=\"switch\"\n          data-language-toggle\n          data-aria-label-to-en=\"Passer l'interface en anglais\"\n          data-aria-label-to-fr=\"Switch interface to French\"\n          aria-checked=\"false\"\n          data-active-lang=\"fr\"\n          aria-label=\"Passer l'interface en anglais\"\n          title=\"Passer l'interface en anglais\"\n        >
          <span class=\"language-switch-track\">
            <span class=\"language-switch-option language-switch-option--fr\">FR</span>
            <span class=\"language-switch-option language-switch-option--en\">EN</span>
            <span class=\"language-switch-thumb\" aria-hidden=\"true\"></span>
          </span>
        </button>
      </div>
    </header>
    <main>
      <h1 class=\"page-title\" data-fr=\"{title_fr}\" data-en=\"{title_en}\"></h1>
      <table class=\"info-table\">
        <tbody>
          <tr>
            <th data-fr=\"Identifiant\" data-en=\"Identifier\"></th>
            <td>{id}</td>
          </tr>
          <tr>
            <th data-fr=\"Script associé\" data-en=\"Associated script\"></th>
            <td>{script}</td>
          </tr>
          <tr>
            <th data-fr=\"Niveau de criticité\" data-en=\"Criticality level\"></th>
            <td><span class=\"level-pill level-{level}\">{level}</span></td>
          </tr>
        </tbody>
      </table>
      <section class=\"content-section\">
        <h2 data-fr=\"Explications\" data-en=\"Overview\"></h2>
        <p data-fr=\"{description_fr}\" data-en=\"{description_en}\"></p>
      </section>
      <section class=\"content-section\">
        <h2 data-fr=\"Résolution\" data-en=\"Remediation\"></h2>
        <p data-fr=\"{resolution_fr}\" data-en=\"{resolution_en}\"></p>
      </section>
      <a class=\"return-button\" href=\"../index.html\" data-fr=\"Retour à la liste\" data-en=\"Back to list\"></a>
    </main>
    <footer class=\"primary-footer\">
      <div class=\"footer-brand\">MAESTRIA</div>
      <div class=\"footer-links\">
        <div class=\"footer-column\">
          <h3 data-fr=\"Support\" data-en=\"Support\"></h3>
          <ul>
            <li><span data-fr=\"Centre de services\" data-en=\"Service desk\"></span></li>
            <li><span data-fr=\"Documentation technique\" data-en=\"Technical documentation\"></span></li>
          </ul>
        </div>
        <div class=\"footer-column\">
          <h3 data-fr=\"Mentions\" data-en=\"Legal\"></h3>
          <ul>
            <li><span data-fr=\"Mentions légales\" data-en=\"Legal notice\"></span></li>
            <li><span data-fr=\"Politique de confidentialité\" data-en=\"Privacy policy\"></span></li>
          </ul>
        </div>
      </div>
    </footer>
    <script src=\"../assets/js/script.js\"></script>
  </body>
</html>
"""

for item in checks:
    html = detail_template.format(**item)
    (root / 'checks' / f"{item['slug']}.html").write_text(html, encoding='utf-8')

print("Documentation generated.")
