import React, { Component } from 'react';
import { 
    View, 
    Animated,
    PanResponder,
    Dimensions,
    LayoutAnimation,
    UIManager
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;
const SWIPE_OUT_DURATION = 250

class Deck extends Component {
    // If the user does not pass the required props,
    // the component will use these ones instead.
    // Why not to use prop type validation?
    // Because we don't want to actually require the props,
    // we just want to call them if available
    static defaultProps = {
        onSwipeRight: () => {},
        onSwipeLeft: () => {}
    }

    // Setup pan responders in constructor
    constructor(props) {
        super(props);

        const position = new Animated.ValueXY();
        const panResponder = PanResponder.create({
            // Asign this panResponder to respond to the gesture
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (event, gesture) => {
                position.setValue({ x: gesture.dx, y: gesture.dy });
            },
            onPanResponderRelease: (event, gesture) => {
                if (gesture.dx > SWIPE_THRESHOLD) {
                    this.forceSwipe('right');
                } else if (gesture.dx < -SWIPE_THRESHOLD) {
                    this.forceSwipe('left');
                } else {
                    this.resetPosition();
                }
            }
        });

        // Traditionally the panResponder is used just as:
        // this.panResponder, as we never call setState(panResponder).
        // The use of this.state.panResponder is mainly just
        // for official documentation
        this.state = { panResponder, position, index: 0 };
    }

    componentWillUpdate() {
        // Compatibility with Android
        UIManager.setLayoutAnimationEnabledExperimental && UIManager.setLayoutAnimationEnabledExperimental(true);
        LayoutAnimation.spring();
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.data !== this.props.data) {
            this.setState({ index: 0 });
        }
    }

    getCardStyle() {
        const { position } = this.state;

        // Take two scales and relate them
        const rotate = position.x.interpolate({
            inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
            outputRange: ['-120deg', '0deg', '120deg']
        });

        // Spread all properties from getLayout to 
        // returned object
        return {
            ...position.getLayout(),
            transform: [{ rotate }]
        }
    }

    resetPosition() {
        Animated.spring(this.state.position, {
            toValue: { x: 0, y: 0 }
        }).start();
    }

    forceSwipe(direction) {
        const x = direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH

        Animated.timing(this.state.position, {
            toValue: { x, y: 0 },
            duration: SWIPE_OUT_DURATION
        }).start(() => this.onSwipeComplete(direction));
    }

    onSwipeComplete(direction) {
        const { onSwipeLeft, onSwipeRight, data } = this.props;
        const item = data[this.state.index]

        direction === 'right' ? onSwipeRight(item) : onSwipeLeft(item);

        // Reset position as it is not automatically done.
        // Break rules os not modifying state objects (as docs say)
        this.state.position.setValue({ x: 0, y: 0});
        // Do not modify existing value, reset instead
        this.setState({ index: this.state.index + 1 });
    }

    renderCards() {
        if (this.state.index >= this.props.data.length) {
            return this.props.renderNoMoreCards();
        }

        return this.props.data.map((item, i) => {
            // Cards that have been swiped
            if (i < this.state.index) { return null; }

            // Font card
            if (i === this.state.index) {
                return (
                    <Animated.View
                        key={item.id}
                        style={[this.getCardStyle(), styles.cardStyle]}
                        {...this.state.panResponder.panHandlers}
                    >
                        {this.props.renderCard(item)}
                    </Animated.View>
                );
            }

            // Rest of the cards
            return (
                <Animated.View 
                    key={item.id} 
                    style={[styles.cardStyle, { top: 10 * (i - this.state.index) }, { zIndex: 0 }]}
                >
                    {this.props.renderCard(item)}
                </Animated.View>
            );
        }).reverse(); 
        // Reverse array as position: absolute
        // causes the last element to show on top
    }

    render() {
        // panHandlers: Object with callbacks to intercept presses from a user.
        // Take all of those handlers and spread them to the view
        return (
            <View>
                {this.renderCards()}
            </View>
        );
    }
}

// Stack cards. Cards shrink to minimum width required
const styles = {
    cardStyle: {
        position: 'absolute',
        width: SCREEN_WIDTH
    }
};	


export default Deck;