package com.admin.service;

import com.admin.common.lang.R;

public interface BackupService {
    R exportAll();
    R importAll(String backupJson);
}
