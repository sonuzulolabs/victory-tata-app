import { HStack, Image, ProgressView, Text, VStack } from '@expo/ui/swift-ui';
import {
  activityBackgroundTint,
  font,
  foregroundStyle,
  frame,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

export type VisitTrackingActivityProps = {
  etaMinutes: number;
  arrivalLabel: string;
  addressLine: string;
  lastUpdatedLabel: string;
  progress: number;
  carLabel: string;
};

const BRAND = '#0A1848';
const ACCENT = '#B8F035';
const MUTED = '#9CA3AF';
function MetricColumn(props: { value: string; unit: string; label: string }) {
  return (
    <VStack alignment="center" spacing={2} modifiers={[frame({ maxWidth: Infinity })]}>
      <HStack alignment="firstTextBaseline" spacing={2}>
        <Text modifiers={[font({ weight: 'bold', size: 22 }), foregroundStyle('#FFFFFF')]}>
          {props.value}
        </Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(MUTED)]}>{props.unit}</Text>
      </HStack>
      <Text modifiers={[font({ size: 12 }), foregroundStyle(MUTED)]}>{props.label}</Text>
    </VStack>
  );
}

const VisitTrackingActivity = (
  props: VisitTrackingActivityProps,
  _environment: LiveActivityEnvironment,
) => {
  'widget';

  const progress = Math.min(1, Math.max(0, props.progress));
  const etaDisplay = props.etaMinutes <= 0 ? '0' : String(props.etaMinutes);
  const etaUnit = props.etaMinutes === 1 ? 'min' : 'min';
  const progressPct = Math.round(progress * 100);

  const bannerCard = (
    <VStack
      spacing={10}
      modifiers={[
        padding({ all: 14 }),
        activityBackgroundTint('#1C1C1E'),
      ]}>
      <HStack alignment="center">
        <HStack spacing={8} alignment="center" modifiers={[frame({ maxWidth: Infinity })]}>
          <VStack
            alignment="center"
            modifiers={[
              frame({ width: 28, height: 28 }),
              padding({ all: 4 }),
              foregroundStyle(BRAND),
            ]}>
            <Image systemName="car.side.fill" color="#FFFFFF" />
          </VStack>
          <Text modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle('#FFFFFF')]}>
            Victory Tata
          </Text>
        </HStack>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(MUTED)]}>{props.lastUpdatedLabel}</Text>
      </HStack>

      <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle('#FFFFFF')]}>
        {props.addressLine}
      </Text>

      <ProgressView value={progress} modifiers={[frame({ maxWidth: Infinity, height: 8 })]} />

      <HStack spacing={8}>
        <MetricColumn value={etaDisplay} unit={etaUnit} label="ETA" />
        <MetricColumn value={props.arrivalLabel} unit="" label="Arrival" />
        <MetricColumn value={String(progressPct)} unit="%" label="Progress" />
      </HStack>

      <Text modifiers={[font({ size: 11 }), foregroundStyle(MUTED)]}>{props.carLabel}</Text>
    </VStack>
  );

  return {
    banner: bannerCard,
    compactLeading: <Image systemName="car.side.fill" color={ACCENT} />,
    compactTrailing: (
      <Text modifiers={[font({ weight: 'bold', size: 14 }), foregroundStyle(ACCENT)]}>
        {etaDisplay}m
      </Text>
    ),
    minimal: <Image systemName="car.side.fill" color={ACCENT} />,
    expandedLeading: <Image systemName="car.side.fill" color={ACCENT} />,
    expandedTrailing: (
      <VStack alignment="trailing" spacing={2}>
        <Text modifiers={[font({ weight: 'bold', size: 20 }), foregroundStyle('#FFFFFF')]}>
          {etaDisplay} min
        </Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(MUTED)]}>ETA</Text>
      </VStack>
    ),
    expandedBottom: (
      <VStack spacing={4} modifiers={[padding({ horizontal: 12 })]}>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(MUTED)]}>{props.addressLine}</Text>
        <ProgressView value={progress} />
      </VStack>
    ),
  };
};

export default createLiveActivity('VisitTrackingActivity', VisitTrackingActivity);
