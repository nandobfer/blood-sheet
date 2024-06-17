"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sheet = void 0;
const node_1 = __importDefault(require("read-excel-file/node"));
const input_schema_1 = require("../input_schema");
const promises_1 = require("fs/promises");
const convert_array_to_csv_1 = require("convert-array-to-csv");
const fs_1 = require("fs");
class Sheet {
    constructor() { }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            const inputs = yield this.getInputs();
            console.log("importando registros");
            const records = (yield Promise.all(inputs.map((file) => __awaiter(this, void 0, void 0, function* () { return yield this.importSheet(file); })))).flatMap((item) => item);
            console.log(`total: ${records.length} registros`);
            const filtered_records = this.ageFilter(records);
            console.log(`total: ${filtered_records.length} registros após o filtro`);
            console.log('processando registros');
            const processed_records = filtered_records.map(item => this.processRow(item));
            this.generateOutput(processed_records);
        });
    }
    importSheet(file) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, node_1.default)(file, { schema: input_schema_1.input_schema, sheet: 1 });
            console.log(`${result.rows.length} registros indexados`);
            return result.rows;
        });
    }
    getInputs() {
        return __awaiter(this, void 0, void 0, function* () {
            const dir = "./input";
            console.log("identificando arquivos de entrada");
            const inputs = (yield (0, promises_1.readdir)(dir)).map((item) => `${dir}/${item}`);
            console.log(`${inputs.length} arquivos encontrados`);
            return inputs;
        });
    }
    processRow(row) {
        const cre_resultado = this.findField(row, "CRE\nRESULTADO");
        const output = {
            idade_reduzida: this.getAge(row).toString(),
            idade_do_paciente_na_coleta: row.idade_do_paciente_na_coleta,
            sexo: row.sexo,
            cre_resultado: cre_resultado,
            clearence: cre_resultado ? this.calculateClearance(row.sexo == 'Masculino' ? 0 : 1, this.getAge(row), Number(cre_resultado.replace(',', '.'))).toString() : "",
            cal_resultado: this.findField(row, "CAL\nRESULTADO"),
            vid_abbott: this.findField(row, "VID\nABBOTT"),
            pth_result_alinity: this.findField(row, "PTH\nRESUL ALINITY"),
        };
        return output;
    }
    findField(record, field) {
        const column = Object.entries(record).find(([key, value]) => value == field);
        if (column) {
            const key = column[0].split("_")[1];
            // @ts-ignore
            const field_value = record[`resultado_${key}`];
            return Number(field_value.replace(',', '.')).toFixed(2);
        }
        return "";
    }
    getAge(record) {
        var _a;
        return record.idade_reduzida ? Number(record.idade_reduzida) : Number((_a = record.idade_do_paciente_na_coleta) === null || _a === void 0 ? void 0 : _a.split(" ")[0]);
    }
    ageFilter(records) {
        let under_age = 0;
        let over_age = 0;
        console.log("excluindo registros de pacientes cuja idade esteja fora do intervalo 18 <= IDADE <= 100");
        const result = records.filter((record) => {
            const age = this.getAge(record);
            if (isNaN(age))
                return true;
            const in_range = age >= 18 && age <= 100;
            if (!in_range) {
                if (age < 18)
                    under_age++;
                if (age > 100)
                    over_age++;
            }
            return in_range;
        });
        console.log(`${under_age} pacientes abaixo de 18 anos`);
        console.log(`${over_age} pacientes acima de 100 anos`);
        return result;
    }
    calculateClearance(sexo, idade, cre_resultado) {
        let result = 0;
        const kappa = sexo === 0 ? 0.9 : 0.7;
        const alpha = sexo === 0 ? -0.302 : -0.241;
        const factor = sexo === 0 ? 1 : 1.012;
        const scrRatio = cre_resultado / kappa;
        const a = sexo === 0 ? 142 : 142;
        const b = sexo === 0 ? -1.2 : -1.2;
        const multiplier = sexo === 0 ? 0.9938 : 0.9938;
        if (cre_resultado > kappa) {
            result = a * Math.pow(scrRatio, b) * Math.pow(multiplier, idade) * factor;
        }
        else {
            result = a * Math.pow(scrRatio, alpha) * Math.pow(multiplier, idade) * factor;
        }
        return result.toFixed(5);
    }
    generateOutput(records) {
        console.log("gerando planilha com resultados");
        const dir_name = './output';
        const file_name = `${dir_name}/Resultado-${new Date().toLocaleString('pt-br').replace(/[\/,: ]+/g, '-')}.csv`;
        const header = [
            'IDADE REDUZIDA',
            'IDADE DO PACIENTE NA COLETA',
            'SEXO',
            'CRE RESULTADO',
            'CLEARANCE',
            'CAL RESULTADO',
            'VID ABBOTT',
            'PTH RESULT ALINITY',
        ];
        const data = Object.values(records);
        const csv_data = (0, convert_array_to_csv_1.convertArrayToCSV)(data, { header, separator: ';' });
        if (!(0, fs_1.existsSync)(dir_name)) {
            (0, fs_1.mkdirSync)(dir_name, { recursive: true });
        }
        (0, fs_1.writeFileSync)(file_name, csv_data);
        console.log(`resultados salvos em ${file_name}`);
    }
}
exports.Sheet = Sheet;
