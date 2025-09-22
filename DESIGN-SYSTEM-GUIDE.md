# 🎨 Professional Design System Guide

## ✨ Overview

Et komplet, moderne design system der gør din Progressive Overload app professionel og visuelt imponerende.

## 🎨 **Design Philosophy**

- **Modern & Clean** - Minimalistisk design med fokus på brugervenlighed
- **Konsistent** - Sammenhængende design på tværs af alle screens
- **Accessible** - Tilgængelig for alle brugere
- **Performance-First** - Optimeret for hurtig rendering
- **Responsive** - Fungerer perfekt på alle enheder

## 🌈 **Color System**

### Primary Colors
```tsx
Colors.primary[500] // #FF6B35 - Main brand color
Colors.primary[50]  // #FFF4ED - Very light
Colors.primary[900] // #992A0D - Very dark
```

### Usage Examples
```tsx
import { Colors } from '@/components/ui';

// Primary button
backgroundColor: Colors.primary[500]

// Success state
backgroundColor: Colors.success[500]

// Text colors
color: Colors.neutral[900] // Primary text
color: Colors.neutral[600] // Secondary text
```

## 🔤 **Typography**

### Hierarchy
```tsx
<Typography variant="h1">Main Headlines</Typography>
<Typography variant="h2">Section Headers</Typography>
<Typography variant="body1">Body text</Typography>
<Typography variant="caption">Small text</Typography>
```

### Custom Styling
```tsx
<Typography 
  variant="h3" 
  color="primary" 
  weight="bold"
  align="center"
>
  Custom Heading
</Typography>
```

## 🧩 **UI Components**

### Buttons
```tsx
// Primary button
<Button title="Start Workout" variant="primary" />

// Gradient button
<Button title="Premium" variant="gradient" />

// With icon
<Button 
  title="Add Exercise" 
  icon="add" 
  variant="outline" 
/>
```

### Cards
```tsx
// Default card
<Card>
  <Typography variant="h6">Workout Summary</Typography>
</Card>

// Gradient card
<Card variant="gradient" gradientColors={Colors.gradients.sunset}>
  <Typography color="white">Premium Feature</Typography>
</Card>
```

### Input Fields
```tsx
<Input
  label="Exercise Name"
  placeholder="Enter exercise name"
  leftIcon="search"
  error={errors.name}
  required
/>
```

### Badges
```tsx
<Badge variant="success" size="sm">Complete</Badge>
<Badge variant="warning" icon="time">5 min left</Badge>
```

### Icons
```tsx
// Simple icon
<Icon name="heart" size="md" color="primary" />

// Filled icon with background
<Icon name="star" variant="filled" color="warning" />

// Pre-made workout icons
<WorkoutIcon size="lg" variant="gradient" />
<ExerciseIcon color="primary" />
```

## 📐 **Layout System**

### Grid System
```tsx
// Responsive grid
<Grid columns={2} spacing={4}>
  <Card>Item 1</Card>
  <Card>Item 2</Card>
</Grid>

// Auto-responsive card grid
<CardGrid minCardWidth={280}>
  {workouts.map(workout => (
    <WorkoutCard key={workout.id} workout={workout} />
  ))}
</CardGrid>
```

### Flex Layout
```tsx
<Flex direction="row" justify="space-between" align="center">
  <Typography variant="h6">Progress</Typography>
  <Badge>75%</Badge>
</Flex>
```

### Container & Spacing
```tsx
<Container maxWidth="lg" padding={4}>
  <ScreenLayout scrollable>
    {content}
  </ScreenLayout>
</Container>
```

## 🎬 **Animations**

### Entry Animations
```tsx
// Fade in components
<FadeIn delay={200}>
  <Card>Content</Card>
</FadeIn>

// Slide in from bottom
<SlideIn direction="up" duration={300}>
  <Button>Action Button</Button>
</SlideIn>

// Staggered list animations
<StaggeredContainer animationType="slideIn" staggerDelay={100}>
  {exercises.map(exercise => (
    <ExerciseCard key={exercise.id} exercise={exercise} />
  ))}
</StaggeredContainer>
```

### Interactive Animations
```tsx
// Pulse for attention
<Pulse>
  <NotificationBadge />
</Pulse>

// Shake for errors
<Shake trigger={hasError}>
  <Input error="Invalid input" />
</Shake>

// Animated progress
<AnimatedProgressBar progress={0.75} color={Colors.success[500]} />
```

### Custom Animations
```tsx
// Loading states
<LoadingSpinner size={40} color={Colors.primary[500]} />

// Success feedback
<SuccessCheck size={60} />

// Animated counters
<AnimatedCounter value={250} formatter={(v) => `${v} kg`} />
```

## 📱 **Responsive Design**

### Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 768px  
- **Desktop**: > 768px

### Usage
```tsx
const { isMobile, isTablet } = useResponsive();

<Grid columns={isMobile ? 1 : isTablet ? 2 : 3}>
  {content}
</Grid>
```

### Adaptive Spacing
```tsx
const spacing = useAdaptiveSpacing();

<View style={{ padding: spacing.md }}>
  {/* Automatically adjusts padding based on device */}
</View>
```

## 🎯 **Best Practices**

### 1. **Consistency**
```tsx
// ✅ Use design system colors
backgroundColor: Colors.primary[500]

// ❌ Don't use hardcoded colors
backgroundColor: '#FF6B35'
```

### 2. **Spacing**
```tsx
// ✅ Use spacing scale
marginTop: Spacing[4]

// ❌ Don't use arbitrary values
marginTop: 17
```

### 3. **Typography**
```tsx
// ✅ Use Typography component
<Typography variant="body1">Text content</Typography>

// ❌ Don't use raw Text
<Text style={{ fontSize: 16 }}>Text content</Text>
```

### 4. **Animations**
```tsx
// ✅ Use design system animations
<FadeIn duration={Animations.duration.normal}>

// ❌ Don't use custom durations
<FadeIn duration={275}>
```

## 🏗 **Implementation Example**

```tsx
import {
  ScreenLayout,
  Container,
  Card,
  Button,
  Typography,
  Grid,
  Icon,
  FadeIn,
  StaggeredContainer,
  Colors,
} from '@/components/ui';

export default function WorkoutScreen() {
  return (
    <ScreenLayout>
      <Container>
        <FadeIn>
          <Typography variant="h2" color="primary" align="center">
            Today's Workout
          </Typography>
        </FadeIn>
        
        <StaggeredContainer animationType="slideIn" staggerDelay={100}>
          <Grid columns={2} spacing={4}>
            <Card variant="gradient">
              <Icon name="barbell" variant="filled" size="xl" />
              <Typography variant="h6" color="white">
                Strength Training
              </Typography>
            </Card>
            
            <Card>
              <Typography variant="h6">Progress</Typography>
              <AnimatedProgressBar progress={0.75} />
            </Card>
          </Grid>
          
          <Button 
            title="Start Workout" 
            variant="gradient"
            icon="play"
            fullWidth
          />
        </StaggeredContainer>
      </Container>
    </ScreenLayout>
  );
}
```

## 🎊 **Benefits**

### **Visual Excellence**
- 🎨 **Professional appearance** der imponerer brugere
- 🌈 **Sammenhængende farvepalette** på tværs af hele appen
- ✨ **Smooth animationer** der gør interaktionen fornøjelig

### **Developer Experience**
- ⚡ **Hurtig udvikling** med pre-built komponenter
- 🔧 **TypeScript support** for bedre type safety
- 📱 **Responsive by default** - virker på alle enheder

### **Performance**
- 🚀 **Optimeret rendering** med memo og virtualisering
- 💨 **Hurtige animationer** med native driver
- 📦 **Mindre bundle size** gennem tree shaking

### **Maintenance**
- 🎯 **Konsistent design** gør ændringer nemmere
- 🔄 **Genbrugelige komponenter** reducerer duplikering
- 📖 **Dokumenteret system** for nemme opdateringer

Din app vil nu se professionel og moderne ud! 🎉
