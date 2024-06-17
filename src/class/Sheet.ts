import readXlsxFile from "read-excel-file/node"
import { input_schema } from "../input_schema"
import { readdir } from "fs/promises"
import { BloodDataInput, BloodDataOutput, BloodField } from "../types/BloodData"
import {convertArrayToCSV} from 'convert-array-to-csv'
import { existsSync, mkdirSync, writeFileSync } from "fs"

export class Sheet {
    constructor() {}

    async run() {
        const inputs = await this.getInputs()
        console.log("importando registros")
        const records = (await Promise.all(inputs.map(async (file) => await this.importSheet(file)))).flatMap((item) => item)
        console.log(`total: ${records.length} registros`)
        const filtered_records = this.ageFilter(records)
        console.log(`total: ${filtered_records.length} registros após o filtro`)

        console.log('processando registros')
        const processed_records = filtered_records.map(item => this.processRow(item))

        this.generateOutput(processed_records)
    }

    async importSheet(file: string) {
        const result = await readXlsxFile(file, { schema: input_schema, sheet: 1 })
        console.log(`${result.rows.length} registros indexados`)
        return result.rows as BloodDataInput[]
    }

    async getInputs() {
        const dir = "./input"
        console.log("identificando arquivos de entrada")
        const inputs = (await readdir(dir)).map((item) => `${dir}/${item}`)
        console.log(`${inputs.length} arquivos encontrados`)
        return inputs
    }

    processRow(row: BloodDataInput) {
        const cre_resultado = this.findField(row, "CRE\nRESULTADO")
        const output: BloodDataOutput = {
            idade_reduzida: this.getAge(row).toString(),
            idade_do_paciente_na_coleta: row.idade_do_paciente_na_coleta,
            sexo: row.sexo,
            cre_resultado: cre_resultado,
            clearence: cre_resultado ? this.calculateClearance(row.sexo == 'Masculino' ? 0 : 1, this.getAge(row), Number(cre_resultado.replace(',','.'))).toString() : "",
            cal_resultado: this.findField(row, "CAL\nRESULTADO"),
            vid_abbott: this.findField(row, "VID\nABBOTT"),
            pth_result_alinity: this.findField(row, "PTH\nRESUL ALINITY"),
        }
        return output
    }

    findField(record: BloodDataInput, field: BloodField) {
        const column = Object.entries(record).find(([key, value]) => value == field)
        if (column) {
            const key = column[0].split("_")[1]
            // @ts-ignore
            const field_value = record[`resultado_${key}`] as string
            return Number(field_value.replace(',','.')).toFixed(2)
        }

        return ""
    }

    getAge(record: BloodDataInput) {
        return record.idade_reduzida ? Number(record.idade_reduzida) : Number(record.idade_do_paciente_na_coleta?.split(" ")[0])
    }

    ageFilter(records: BloodDataInput[]) {
        let under_age = 0
        let over_age = 0
        console.log("excluindo registros de pacientes cuja idade esteja fora do intervalo 18 <= IDADE <= 100")
        const result = records.filter((record) => {
            const age = this.getAge(record)
            if (isNaN(age)) return true
            const in_range = age >= 18 && age <= 100

            if (!in_range) {
                if (age < 18) under_age++
                if (age > 100) over_age++
            }

            return in_range
        })

        console.log(`${under_age} pacientes abaixo de 18 anos`)
        console.log(`${over_age} pacientes acima de 100 anos`)

        return result
    }

    calculateClearance(sexo: number, idade: number, cre_resultado: number) {
        let result = 0
        const kappa = sexo === 0 ? 0.9 : 0.7
        const alpha = sexo === 0 ? -0.302 : -0.241
        const factor = sexo === 0 ? 1 : 1.012
        const scrRatio = cre_resultado / kappa

        const a = sexo === 0 ? 142 : 142
        const b = sexo === 0 ? -1.2 : -1.2
        const multiplier = sexo === 0 ? 0.9938 : 0.9938

        if (cre_resultado > kappa) {
            result = a * Math.pow(scrRatio, b) * Math.pow(multiplier, idade) * factor
        } else {
            result = a * Math.pow(scrRatio, alpha) * Math.pow(multiplier, idade) * factor
        }

        return result.toFixed(5)
    }

    generateOutput(records: BloodDataOutput[]) {
        console.log("gerando planilha com resultados")
        const dir_name = './output'
        const file_name = `${dir_name}/Resultado-${new Date().toLocaleString('pt-br').replace(/[\/,: ]+/g, '-')}.csv`

        const header = [
            'IDADE REDUZIDA',
            'IDADE DO PACIENTE NA COLETA',
            'SEXO',
            'CRE RESULTADO',
            'CLEARANCE',
            'CAL RESULTADO',
            'VID ABBOTT',
            'PTH RESULT ALINITY',
        ]

        const data = Object.values(records)
        const csv_data = convertArrayToCSV(data, { header, separator: ';' })

        if (!existsSync(dir_name)) {
            mkdirSync(dir_name, { recursive: true })
        }

        writeFileSync(file_name, csv_data)
        console.log(`resultados salvos em ${file_name}`)
    }
}
