import { jsx } from 'react/jsx-runtime'
import { RecipeWidget } from './recipe.js'
import { StatWidget, ProgressWidget, ChartWidget, CalculatorWidget, DonutWidget, MatrixWidget, DiagramWidget, GaugeWidget, ScatterWidget, SparklineWidget } from './data-widgets.js'
import { TableWidget, StepsWidget, CardsWidget, ChecklistWidget, TabsWidget, OptionsWidget, NoticeWidget, TimelineWidget, AccordionWidget, KeyValueWidget } from './content-widgets.js'

const handlers={recipe:RecipeWidget,accordion:AccordionWidget,kv:KeyValueWidget,keyvalue:KeyValueWidget,gauge:GaugeWidget,scatter:ScatterWidget,sparkline:SparklineWidget,metric:StatWidget,stats:StatWidget,progress:ProgressWidget,bars:ChartWidget,bar:ChartWidget,line:({attrs})=>jsx(ChartWidget,{attrs,line:true}),table:TableWidget,steps:StepsWidget,cards:CardsWidget,checklist:ChecklistWidget,tabs:TabsWidget,options:OptionsWidget,notice:NoticeWidget,calc:CalculatorWidget,calculator:CalculatorWidget,donut:DonutWidget,pie:DonutWidget,timeline:TimelineWidget,matrix:MatrixWidget,compare:MatrixWidget,diagram:DiagramWidget,flow:DiagramWidget}

function getWidget(kind) {
  return Object.hasOwn(handlers, kind) ? handlers[kind] : null
}

export { getWidget }
