import { createLibrary, defineComponent } from '@openuidev/react-lang'
import { jsx } from 'react/jsx-runtime'
import { z } from 'zod/v4'
import { actions } from '../../../vendor/thesys-lib/actions'
import { functions } from '../../../vendor/thesys-lib/functions'
import { Chart } from '../../../vendor/thesys-lib/components/chart'
import {
  Button, Checkbox, DatePicker, IconButton, Input, Pressable, RadioGroup,
  SegmentedControl, Select, Slider, TextArea, Timer
} from '../../../vendor/thesys-lib/components/controls'
import { Box, Card, Col, Divider, Form, createGrid, Row, Spacer } from '../../../vendor/thesys-lib/components/layout'
import { Icon, Photo } from '../../../vendor/thesys-lib/components/media'
import { svgComponents } from '../../../vendor/thesys-lib/components/svg'
import { radiusSchema } from '../../../vendor/thesys-lib/components/style'
import { Table } from '../../../vendor/thesys-lib/components/table'
import {
  Badge, Caption, Label, Link, List, ListItem, Markdown, Text, Title
} from '../../../vendor/thesys-lib/components/text'

// Thesys's optional image-search service is not hosted by Hermes. Direct
// HTTPS photos still use the same component and stay inside the card.
const Image = defineComponent({
  name: 'Image',
  props: z.object({
    src: z.string(), alt: z.string().optional(), aspectRatio: z.number().optional(),
    radius: radiusSchema.optional(), fit: z.enum(['cover', 'contain']).optional()
  }),
  component: ({ props }) => {
    let src: string | undefined
    try {
      const url = new URL(props.src)
      if (url.protocol === 'https:' && !url.username && !url.password) src = url.href
    } catch { /* Missing or invalid source falls back to the image placeholder. */ }
    return jsx(Photo, { ...props, query: props.alt || '', src, search: false })
  }
})

const Grid = createGrid(180)

export const library = createLibrary({
  root: 'Col',
  components: [
    Col, Row, Box, Grid, Card, Divider, Spacer, Title, Text, Caption, Label, Badge,
    Link, List, ListItem, Markdown, Button, IconButton, Pressable, Input, TextArea,
    Select, SegmentedControl, Slider, Checkbox, RadioGroup, DatePicker, Timer, Form,
    Image, Icon, Table, Chart, ...svgComponents
  ],
  functions,
  actions
})
