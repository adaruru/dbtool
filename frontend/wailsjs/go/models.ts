export namespace migration {
	
	export class TableState {
	    Name: string;
	    Schema: string;
	    Status: string;
	    TotalRows: number;
	    MigratedRows: number;
	    // Go type: time
	    StartTime: any;
	    // Go type: time
	    EndTime: any;
	    Error: string;
	
	    static createFrom(source: any = {}) {
	        return new TableState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Name = source["Name"];
	        this.Schema = source["Schema"];
	        this.Status = source["Status"];
	        this.TotalRows = source["TotalRows"];
	        this.MigratedRows = source["MigratedRows"];
	        this.StartTime = this.convertValues(source["StartTime"], null);
	        this.EndTime = this.convertValues(source["EndTime"], null);
	        this.Error = source["Error"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class MigrationState {
	    Status: string;
	    // Go type: time
	    StartTime: any;
	    TotalTables: number;
	    CompletedTables: number;
	    TotalRows: number;
	    MigratedRows: number;
	    CurrentTable: string;
	    Tables: Record<string, TableState>;
	    Errors: string[];
	
	    static createFrom(source: any = {}) {
	        return new MigrationState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Status = source["Status"];
	        this.StartTime = this.convertValues(source["StartTime"], null);
	        this.TotalTables = source["TotalTables"];
	        this.CompletedTables = source["CompletedTables"];
	        this.TotalRows = source["TotalRows"];
	        this.MigratedRows = source["MigratedRows"];
	        this.CurrentTable = source["CurrentTable"];
	        this.Tables = this.convertValues(source["Tables"], TableState, true);
	        this.Errors = source["Errors"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace types {
	
	export class ColumnDifference {
	    column: string;
	    sourceValue: string;
	    targetValue: string;
	
	    static createFrom(source: any = {}) {
	        return new ColumnDifference(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.column = source["column"];
	        this.sourceValue = source["sourceValue"];
	        this.targetValue = source["targetValue"];
	    }
	}
	export class ColumnInfo {
	    name: string;
	    dataType: string;
	    maxLength: number;
	    precision: number;
	    scale: number;
	    isNullable: boolean;
	    isIdentity: boolean;
	    defaultValue?: string;
	    isPrimaryKey: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ColumnInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.dataType = source["dataType"];
	        this.maxLength = source["maxLength"];
	        this.precision = source["precision"];
	        this.scale = source["scale"];
	        this.isNullable = source["isNullable"];
	        this.isIdentity = source["isIdentity"];
	        this.defaultValue = source["defaultValue"];
	        this.isPrimaryKey = source["isPrimaryKey"];
	    }
	}
	export class ConnectionConfig {
	    id: string;
	    name: string;
	    type: string;
	    connectionString: string;
	    database: string;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    lastUsedAt?: any;
	
	    static createFrom(source: any = {}) {
	        return new ConnectionConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.type = source["type"];
	        this.connectionString = source["connectionString"];
	        this.database = source["database"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.lastUsedAt = this.convertValues(source["lastUsedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ConnectionTestResult {
	    success: boolean;
	    message: string;
	    serverVersion?: string;
	    databases?: string[];
	
	    static createFrom(source: any = {}) {
	        return new ConnectionTestResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.message = source["message"];
	        this.serverVersion = source["serverVersion"];
	        this.databases = source["databases"];
	    }
	}
	export class ForeignKey {
	    name: string;
	    columns: string[];
	    referencedSchema: string;
	    referencedTable: string;
	    referencedColumns: string[];
	    onDelete: string;
	    onUpdate: string;
	
	    static createFrom(source: any = {}) {
	        return new ForeignKey(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.columns = source["columns"];
	        this.referencedSchema = source["referencedSchema"];
	        this.referencedTable = source["referencedTable"];
	        this.referencedColumns = source["referencedColumns"];
	        this.onDelete = source["onDelete"];
	        this.onUpdate = source["onUpdate"];
	    }
	}
	export class ParameterInfo {
	    name: string;
	    dataType: string;
	    direction: string;
	    hasDefault: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ParameterInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.dataType = source["dataType"];
	        this.direction = source["direction"];
	        this.hasDefault = source["hasDefault"];
	    }
	}
	export class FunctionInfo {
	    schema: string;
	    name: string;
	    definition: string;
	    returnType: string;
	    parameters: ParameterInfo[];
	
	    static createFrom(source: any = {}) {
	        return new FunctionInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.schema = source["schema"];
	        this.name = source["name"];
	        this.definition = source["definition"];
	        this.returnType = source["returnType"];
	        this.parameters = this.convertValues(source["parameters"], ParameterInfo);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class IndexInfo {
	    name: string;
	    columns: string[];
	    isUnique: boolean;
	    isClustered: boolean;
	
	    static createFrom(source: any = {}) {
	        return new IndexInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.columns = source["columns"];
	        this.isUnique = source["isUnique"];
	        this.isClustered = source["isClustered"];
	    }
	}
	export class LogEntry {
	    id: number;
	    migrationId: string;
	    level: string;
	    message: string;
	    tableName: string;
	    details: string;
	    // Go type: time
	    createdAt: any;
	
	    static createFrom(source: any = {}) {
	        return new LogEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.migrationId = source["migrationId"];
	        this.level = source["level"];
	        this.message = source["message"];
	        this.tableName = source["tableName"];
	        this.details = source["details"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class MigrationConfig {
	    sourceConnectionString: string;
	    targetConnectionString: string;
	    sourceDatabase: string;
	    targetDatabase: string;
	    includeSchema: boolean;
	    includeData: boolean;
	    includeTables?: string[];
	    excludeTables?: string[];
	    includeViews: boolean;
	    includeProcedures: boolean;
	    includeFunctions: boolean;
	    includeTriggers: boolean;
	    batchSize: number;
	    parallelTables: number;
	    dropTargetIfExists: boolean;
	
	    static createFrom(source: any = {}) {
	        return new MigrationConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sourceConnectionString = source["sourceConnectionString"];
	        this.targetConnectionString = source["targetConnectionString"];
	        this.sourceDatabase = source["sourceDatabase"];
	        this.targetDatabase = source["targetDatabase"];
	        this.includeSchema = source["includeSchema"];
	        this.includeData = source["includeData"];
	        this.includeTables = source["includeTables"];
	        this.excludeTables = source["excludeTables"];
	        this.includeViews = source["includeViews"];
	        this.includeProcedures = source["includeProcedures"];
	        this.includeFunctions = source["includeFunctions"];
	        this.includeTriggers = source["includeTriggers"];
	        this.batchSize = source["batchSize"];
	        this.parallelTables = source["parallelTables"];
	        this.dropTargetIfExists = source["dropTargetIfExists"];
	    }
	}
	export class MigrationRecord {
	    id: string;
	    name: string;
	    sourceConnectionId: string;
	    targetConnectionId: string;
	    sourceDatabase: string;
	    targetDatabase: string;
	    status: string;
	    config: string;
	    // Go type: time
	    startedAt?: any;
	    // Go type: time
	    completedAt?: any;
	    // Go type: time
	    createdAt: any;
	    totalTables: number;
	    completedTables: number;
	    totalRows: number;
	    migratedRows: number;
	
	    static createFrom(source: any = {}) {
	        return new MigrationRecord(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.sourceConnectionId = source["sourceConnectionId"];
	        this.targetConnectionId = source["targetConnectionId"];
	        this.sourceDatabase = source["sourceDatabase"];
	        this.targetDatabase = source["targetDatabase"];
	        this.status = source["status"];
	        this.config = source["config"];
	        this.startedAt = this.convertValues(source["startedAt"], null);
	        this.completedAt = this.convertValues(source["completedAt"], null);
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.totalTables = source["totalTables"];
	        this.completedTables = source["completedTables"];
	        this.totalRows = source["totalRows"];
	        this.migratedRows = source["migratedRows"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class MismatchDetail {
	    primaryKey: any;
	    type: string;
	    columnDifferences?: ColumnDifference[];
	
	    static createFrom(source: any = {}) {
	        return new MismatchDetail(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.primaryKey = source["primaryKey"];
	        this.type = source["type"];
	        this.columnDifferences = this.convertValues(source["columnDifferences"], ColumnDifference);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class StoredProcedureInfo {
	    schema: string;
	    name: string;
	    definition: string;
	    parameters: ParameterInfo[];
	
	    static createFrom(source: any = {}) {
	        return new StoredProcedureInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.schema = source["schema"];
	        this.name = source["name"];
	        this.definition = source["definition"];
	        this.parameters = this.convertValues(source["parameters"], ParameterInfo);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TableInfo {
	    schema: string;
	    name: string;
	    rowCount: number;
	    columns: ColumnInfo[];
	    primaryKey: string[];
	    foreignKeys: ForeignKey[];
	    indexes: IndexInfo[];
	
	    static createFrom(source: any = {}) {
	        return new TableInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.schema = source["schema"];
	        this.name = source["name"];
	        this.rowCount = source["rowCount"];
	        this.columns = this.convertValues(source["columns"], ColumnInfo);
	        this.primaryKey = source["primaryKey"];
	        this.foreignKeys = this.convertValues(source["foreignKeys"], ForeignKey);
	        this.indexes = this.convertValues(source["indexes"], IndexInfo);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ValidationConfig {
	    migrationId: string;
	    rowCountValidation: boolean;
	    checksumValidation: boolean;
	    sampleComparison: boolean;
	    sampleSize: number;
	    tables?: string[];
	
	    static createFrom(source: any = {}) {
	        return new ValidationConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.migrationId = source["migrationId"];
	        this.rowCountValidation = source["rowCountValidation"];
	        this.checksumValidation = source["checksumValidation"];
	        this.sampleComparison = source["sampleComparison"];
	        this.sampleSize = source["sampleSize"];
	        this.tables = source["tables"];
	    }
	}
	export class ValidationResult {
	    tableName: string;
	    rowCountMatch: boolean;
	    sourceRowCount: number;
	    targetRowCount: number;
	    checksumMatch: boolean;
	    sourceChecksum: string;
	    targetChecksum: string;
	    sampleMatches: number;
	    sampleMismatches: number;
	    mismatchedRows?: MismatchDetail[];
	    status: string;
	    duration: string;
	
	    static createFrom(source: any = {}) {
	        return new ValidationResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.tableName = source["tableName"];
	        this.rowCountMatch = source["rowCountMatch"];
	        this.sourceRowCount = source["sourceRowCount"];
	        this.targetRowCount = source["targetRowCount"];
	        this.checksumMatch = source["checksumMatch"];
	        this.sourceChecksum = source["sourceChecksum"];
	        this.targetChecksum = source["targetChecksum"];
	        this.sampleMatches = source["sampleMatches"];
	        this.sampleMismatches = source["sampleMismatches"];
	        this.mismatchedRows = this.convertValues(source["mismatchedRows"], MismatchDetail);
	        this.status = source["status"];
	        this.duration = source["duration"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ViewInfo {
	    schema: string;
	    name: string;
	    definition: string;
	
	    static createFrom(source: any = {}) {
	        return new ViewInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.schema = source["schema"];
	        this.name = source["name"];
	        this.definition = source["definition"];
	    }
	}

}

