import {
  forwardRef,
  type ReactNode,
  type ElementType,
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  type ForwardRefRenderFunction,
} from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Base props that are specific to the Button component
 */
interface ButtonOwnProps<E extends ElementType = 'button'> {
  as?: E;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

/**
 * Props that the Button component accepts
 * Combines ButtonOwnProps with the props of the element type
 * Omits keys from the element props that are already defined in ButtonOwnProps
 */
type ButtonProps<E extends ElementType = 'button'> = ButtonOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof ButtonOwnProps<E>>;

/**
 * Props including ref for the polymorphic Button component
 */
type PolymorphicButtonProps<E extends ElementType = 'button'> = ButtonProps<E> & {
  ref?: ComponentPropsWithRef<E>['ref'];
};

/**
 * Type for the polymorphic Button component
 */
type PolymorphicButton = <E extends ElementType = 'button'>(
  props: PolymorphicButtonProps<E>
) => ReactNode;

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 disabled:bg-primary-400',
  secondary:
    'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 disabled:bg-gray-100',
  outline:
    'border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 focus:ring-primary-500 disabled:bg-gray-50 dark:disabled:bg-slate-800',
  ghost:
    'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 focus:ring-gray-500 disabled:bg-transparent',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-400',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

/**
 * Internal render function for the Button component
 */
const ButtonRender: ForwardRefRenderFunction<Element, ButtonProps<ElementType>> = (
  {
    as,
    className,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled,
    children,
    ...props
  },
  ref
) => {
  const Component = as || 'button';

  // Only add disabled prop for native button elements
  const disabledProps =
    Component === 'button' ? { disabled: disabled || isLoading } : {};

  // Add aria-disabled for non-button elements
  const ariaProps =
    Component !== 'button' && (disabled || isLoading)
      ? { 'aria-disabled': true }
      : {};

  return (
    <Component
      ref={ref}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        (disabled || isLoading) && 'cursor-not-allowed opacity-60',
        className
      )}
      {...disabledProps}
      {...ariaProps}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : leftIcon ? (
        <span className="flex-shrink-0" aria-hidden="true">
          {leftIcon}
        </span>
      ) : null}
      {children}
      {rightIcon && !isLoading && (
        <span className="flex-shrink-0" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </Component>
  );
};

/**
 * A polymorphic Button component that can render as different elements or components.
 *
 * @example
 * // Render as a button (default)
 * <Button variant="primary">Click me</Button>
 *
 * @example
 * // Render as a Link from react-router-dom
 * import { Link } from 'react-router-dom';
 * <Button as={Link} to="/dashboard" variant="primary">Go to Dashboard</Button>
 *
 * @example
 * // Render as an anchor tag
 * <Button as="a" href="https://example.com" variant="outline">Visit Site</Button>
 */
export const Button = forwardRef(ButtonRender) as PolymorphicButton & {
  displayName?: string;
};

Button.displayName = 'Button';

// Export types for external use
export type { ButtonProps, ButtonOwnProps, PolymorphicButtonProps };
